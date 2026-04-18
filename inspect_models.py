import pickle
import sys

def inspect_model(path):
    print(f"Inspecting {path}:")
    try:
        with open(path, 'rb') as f:
            model = pickle.load(f)
        print("Type:", type(model))
        if hasattr(model, "feature_names_in_"):
            print("Features expected:", list(model.feature_names_in_))
            print("Number of features:", len(model.feature_names_in_))
        elif hasattr(model, "n_features_in_"):
            print("Number of features expected:", model.n_features_in_)
        else:
            print("Cannot explicitly determine features from model attributes.")
    except Exception as e:
        print("Error loading:", e)
    print("-" * 40)

inspect_model(r'c:\Users\kazbr\projects\tsukumo\public\cardiac-arrest.pkl')
inspect_model(r'c:\Users\kazbr\projects\tsukumo\public\diabetes.pkl')
