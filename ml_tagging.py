import pandas as pd
from sklearn import ensemble, feature_extraction, preprocessing
from sklearn import metrics, model_selection
from scipy import sparse

"""
Ideas to improve accuracy:
    1. Only use MajorType/Subtype, no sub-subtype
    2. Custom encoding ? Where major types are far away, and subtypes
    nearby
    3. Using the model suggested by chatgpt
"""
def tagDataUsingML(df: pd.DataFrame):
    map_labelled = df["type"] != ''
    map_unlabelled = df["type"] == ''

    # All entries should either be labelled or not labelled, not NaN etc
    assert((map_labelled + map_unlabelled).all())

    # Get features vectors
    vectorizer = feature_extraction.text.TfidfVectorizer()
    df_text = vectorizer.fit_transform(df["text"])

    df_debit = preprocessing.StandardScaler().fit_transform(df[["debit"]])
    df_credit = preprocessing.StandardScaler().fit_transform(df[["credit"]])

    # A sparse array like df_text seems required in this hstack
    hstack = sparse.hstack([
            df_text,
            df_debit,
            df_credit
        ])

    # CSR: Compressed Sparse Row
    # Convert to CSR so i can filter out feature rows for
    # labelled/unlabelled rows
    hstack_csr = hstack.tocsr()

    # Training feature vectors
    X = hstack_csr[map_labelled]

    # Get labels vectors
    # Note: RandomForestClassifier doesn't support multi-dimensional
    # vectors like the one produced by onehotencoder, it expects simple
    # numerical labels, hence use LabelEncoder
    encoder = preprocessing.LabelEncoder()

    # Only use non-empty labels, hence df[map_labelled]
    y = encoder.fit_transform(df[map_labelled]["type"])

    # Split train and test datasets, use 95% for train, and 5% for test
    X_train, X_test, y_train, y_test = model_selection.train_test_split(
            X,
            y,
            test_size=0.05)

    # Train the model
    model = ensemble.RandomForestClassifier()
    model.fit(X_train, y_train)

    print("Model Accuracy: ", metrics.accuracy_score(model.predict(X_test),
                                                     y_test))

    X_unlabelled = hstack_csr[map_unlabelled]
    predictions_unlabelled = model.predict(X_unlabelled)

    predictions_decoded = encoder.inverse_transform(predictions_unlabelled)

    df.loc[map_unlabelled, "type"] = "AI/" + predictions_decoded

    return df

