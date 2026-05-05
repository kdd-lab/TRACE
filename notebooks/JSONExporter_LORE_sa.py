import random
import sys

import pandas as pd
import numpy as np
import shap

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
#from xailib.explainers.lime_explainer import LimeXAITabularExplainer

from lore_sa.neighgen import GeneticGenerator


from lore_sa.dataset import TabularDataset
from lore_sa.neighgen import genetic
from lore_sa.encoder_decoder import ColumnTransformerEnc
from lore_sa.lore import Lore
from lore_sa.surrogate import DecisionTreeSurrogate

from lore_sa.bbox import sklearn_classifier_bbox

from sklearn.ensemble import RandomForestClassifier
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.pipeline import make_pipeline
from sklearn.compose import make_column_selector


import json
import os

import logging


# configure root logger to write to stdout (clear existing handlers first)
root_logger = logging.getLogger()
if root_logger.hasHandlers():
    root_logger.handlers.clear()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s'))
handler.setLevel(logging.INFO)
root_logger.addHandler(handler)
root_logger.setLevel(logging.INFO)

logger = logging.getLogger(__name__)
from plot_explanation import PlotExplanation

def load_data_from_csv(class_field, number_of_dataset):
    datasets = ['titanic_c.csv','german_credit.csv','abalone.csv','iris.csv']

    source_file = f'../datasets/{datasets[number_of_dataset]}'
    # Load and transform dataset
    df = pd.read_csv(source_file, skipinitialspace=True, na_values='?', keep_default_na=True)
    if class_field == "Rings":
        df['Rings'] = pd.cut(df['Rings'],
                             bins=[-np.inf, 8, 10, np.inf],
                             labels=['1 - young', '2 - medium', '3 - old'])
    if class_field == "default":
        df['default'] = df['default'].astype(str)
    df_prep = df.drop(columns=[class_field])
    num_indices = [df_prep.columns.get_loc(col) for col in df_prep.select_dtypes(include=[np.number]).columns]
    cat_indices = [df_prep.columns.get_loc(col) for col in df_prep.select_dtypes(exclude=[np.number]).columns]



    preprocessor = ColumnTransformer(transformers=[
        ('num', StandardScaler(),num_indices), #adapts to different dataset
        ('cat',OrdinalEncoder(), cat_indices)
    ])

    return df, preprocessor, class_field



def train_model(df, preprocessor, class_field):
    model = make_pipeline(preprocessor, RandomForestClassifier(n_estimators=100, random_state=42))
    X = df.drop(columns=[class_field]).values  # Select all features except target
    y = df[class_field].values

    X_train, X_test, y_train, y_test = train_test_split(X, y,
                                                        test_size=0.3, random_state=42, stratify=df[class_field].values)
    model.fit(X_train, y_train)

    return model, X_test, X_train, y_test, y_train


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.generic):
            return obj.item()  # For other numpy scalar types
        return super(CustomJSONEncoder, self).default(obj)


def select_and_explain_instance(number_of_dataset,class_field,bbox, X_train, X_test, y_test, sample_length):
    datasets = ['titanic_c.csv', 'german_credit.csv', 'abalone.csv', 'iris.csv']
    source_file = f'../datasets/{datasets[number_of_dataset]}'
    df_raw = pd.read_csv(source_file, skipinitialspace=True, na_values='?', keep_default_na=True)
    if class_field == "Rings":
        df_raw['Rings'] = pd.cut(df_raw['Rings'], bins=[-np.inf, 8, 10, np.inf], labels=['1 - young', '2 - medium', '3 - old'])
    if class_field == "default":
        df_raw['default'] = df_raw['default'].astype(str)
    dataset = TabularDataset(df_raw, class_name=class_field)


    # dataset = TabularDataset(df_raw, class_name=class_field)
    dataset.update_descriptor()
    enc = ColumnTransformerEnc(dataset.descriptor)
    generator = GeneticGenerator(bbox=bbox, dataset=dataset, encoder=enc, ocr=0.1)
    surrogate = DecisionTreeSurrogate(prune_tree=True, grid_search_tree=False)
    tabularLore = Lore(bbox, dataset, enc, generator, surrogate)


    instance_numbers = []

    # select n random indexes from X_test
    for inst_num in random.sample(range(len(X_test)), sample_length):  #range(len(X_test)):
        logger.info(f"Explaining instance {inst_num}")
        instance_numbers.append(inst_num)
        # inst_num = random.randint(0, len(X_test))
        instance = X_test[inst_num]
        true_class = y_test[inst_num]
        #neighbour = generator.generate(instance,200,dataset.descriptor,)
        l_exp= tabularLore.explain(instance, 1000)

        # s_explainer = LimeXAITabularExplainer(bbox) #shap.TreeExplainer(model, X_train_prep)
        # config = {'feature_selection': 'lasso_path'}
        # s_explainer.fit(dataset.df, class_field, config)
        # s_exp = s_explainer.explain(instance)
        # feat_importance = s_exp.exp.as_list()

        predicted_class = bbox.predict(instance.reshape(1, -1))
        predicted_proba = bbox.predict_proba(instance.reshape(1, -1))

        feature_importance_dict = {f: imp for f, imp in l_exp['feature_importances']}


        descr = dataset.descriptor
        features = []
        for i, f in enumerate(descr['numeric']):
            feat = {
                "index": descr['numeric'][f]['index'],
                "name": f,
                "rname": f,
                "type": "numeric",
                "eda": {
                    "min": descr['numeric'][f]['min'],
                    "max": descr['numeric'][f]['max'],
                    "mean": descr['numeric'][f]['mean'],
                    "std": descr['numeric'][f]['std'],
                    "q1": descr['numeric'][f]['q1'],
                    "q3": descr['numeric'][f]['q3'],
                    "median": descr['numeric'][f]['median'],
                },
                "instance_value": instance[descr['numeric'][f]['index']],
                "rule": [],
                "crules": {},
                "feature_importance": feature_importance_dict.get(f, 0.0),
            }
            rule_prem = l_exp['rule']['premises']
            for rule in rule_prem:
                if rule['attr'] == f:
                    feat['rule'].append([{
                        "att": rule["attr"],
                        "is_continuous": True,
                        "op": rule["op"],
                        "thr": rule["val"]

                   }, l_exp['rule']['consequence']['val']])
            for i, cf in enumerate(l_exp['counterfactuals']):
                for rule in cf['premises']:
                    if rule['attr'] == f:
                        if f'C{i}' not in feat['crules']:
                            feat['crules'][f'C{i}'] = []
                        feat['crules'][f'C{i}'].append( [{
                            "att": rule["attr"],
                            "is_continuous": True,
                            "op": rule["op"],
                            "thr": rule["val"]
                        }, cf['consequence']['val']])
            features.append(feat)

        for i, f in enumerate(descr['categorical']):
            for j, c in enumerate(descr['categorical'][f]['count']):
                feat = {
                    "index": descr['categorical'][f]['index'],
                    "name": f"{f}={c}",
                    "rname": f,
                    "type": "categorical",
                    "eda": {
                        "category": c,
                        "count": descr['categorical'][f]['count'][c]
                    },
                    "instance_value": instance[descr['categorical'][f]['index']] == c,
                    "rule": [],
                    "crules": {},
                    "feature_importance": feature_importance_dict.get(f, 0.0),
                }
                rule_prem = l_exp['rule']['premises']
                for rule in rule_prem:
                    if rule['attr'] == f and rule['val'] == c:
                        if rule['op'] == '=':
                            feat['rule'].append([{
                                "att": f'{f}={c}',
                                "is_continuous": False,
                                "op": '>',
                                "thr": 0.5
                            }, l_exp['rule']['consequence']['val']])
                        else:
                            feat['rule'].append([{
                                "att": f'{f}={c}',
                                "is_continuous": False,
                                "op": '<=',
                                "thr": 0.5
                            }, l_exp['rule']['consequence']['val']])
                for i, cf in enumerate(l_exp['counterfactuals']):
                    for rule in cf['premises']:
                        if rule['attr'] == f and rule['val'] == c:
                            if f'C{i}' not in feat['crules']:
                                feat['crules'][f'C{i}'] = []
                            if rule['op'] == '=':
                                feat['crules'][f'C{i}'].append([{
                                    "att": f'{f}={c}',
                                    "is_continuous": False,
                                    "op": '>',
                                    "thr": 0.5
                                }, cf['consequence']['val']])
                            else:
                                feat['crules'][f'C{i}'].append([{
                                    "att": f'{f}={c}',
                                    "is_continuous": False,
                                    "op": '<=',
                                    "thr": 0.5
                                }, cf['consequence']['val']])
                features.append(feat)


        ## Feature Importance Explanation

        # remove key dt from expDict
        crules = l_exp['counterfactuals']
        if len(crules) > 0:
            logger.info(f'Lore crules {len(crules)}')


        output_data = {
            "features": features,
            "predicted_class": predicted_class[0],
            "true_class": true_class,
            "predicted_proba": { label: prob for label, prob in zip(bbox.classes_, predicted_proba[0]) },
        }
        path = f'../d3_sandbox/public/static/{folder}'

        with open(f'{path}/instance_{inst_num}.json', "w") as outfile:
            json.dump(output_data, outfile, cls=CustomJSONEncoder, indent=4)

        # save the output of l_exp.exp to a text file named instance_{inst_num}_lore.txt
        with open(f'{path}/instance_{inst_num}_lore.txt', "w") as outfile:
            outfile.write(str(l_exp))

    print('Instances:')
    print(instance_numbers)

    return instance, len(crules)



if __name__ == '__main__':
    # inst_num = 2
    # inst, num_crules = select_and_explain_instance(inst_num, l_explainer, s_explainer,'../d3_sandbox/static')
    # print(f'Instance {inst_num} explained with {num_crules} counter rules')
    # print(f'Files saved in {path}')

    datasets_parameters = {
        "titanic": {"class_field": "survived", "folder": "titanic_explanations"},
        "german": {"class_field": "default", "folder": "german_explanations"},
        "abalone": {"class_field": "Rings", "folder": "abalone_explanations"},
        "iris": {"class_field": "variety", "folder": "iris_explanations"},
    }

    current_dataset = 'iris'  # Change this to select the dataset
    class_field = datasets_parameters[current_dataset]["class_field"]
    folder = datasets_parameters[current_dataset]["folder"]
    dataset_index = ['titanic', 'german', 'abalone', 'iris'].index(current_dataset)

    # dataset_index = 1  # Select the dataset index (0 for Titanic, 1 for German Credit, etc.)
    # class_field = "default"  # Select the proper class field for the dataset
    # folder = "german_explanations" #Select the folder to save the result
    sample_length = 20  # Number of instances to explain
    df, preprocessor, class_field = load_data_from_csv(class_field, dataset_index)
    model, X_test, X_train, y_test, _ =  train_model(df, preprocessor, class_field)

    instance = select_and_explain_instance(dataset_index, class_field, model, X_train, X_test, y_test, sample_length)