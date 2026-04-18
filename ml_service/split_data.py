import os
import pandas as pd

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, 'public', 'synthetic_iot_data')
CONTINUOUS_FILE = os.path.join(PUBLIC_DATA_DIR, 'wearable_continuous.csv')
CLINICAL_FILE = os.path.join(PUBLIC_DATA_DIR, 'clinical_deep.csv')

TRAINING_OUT = os.path.join(PUBLIC_DATA_DIR, 'training_5years.csv')
STREAMING_OUT = os.path.join(PUBLIC_DATA_DIR, 'streaming_1year.csv')

def split_data():
    print(f"Reading large dataset: {CONTINUOUS_FILE}...")
    # Read with pandas - we'll split by time or line count
    # 6 years total. 5 years = 5/6.
    
    # Since it's huge, we'll read it in chunks or just count lines first
    total_lines = sum(1 for line in open(CONTINUOUS_FILE)) - 1 # exclude header
    five_years_lines = int(total_lines * (5/6))
    
    print(f"Total lines: {total_lines}. Training split (5y): {five_years_lines}")
    
    # Split
    df = pd.read_csv(CONTINUOUS_FILE)
    
    training_df = df.iloc[:five_years_lines]
    streaming_df = df.iloc[five_years_lines:]
    
    print(f"Saving training data to {TRAINING_OUT}...")
    training_df.to_csv(TRAINING_OUT, index=False)
    
    print(f"Saving streaming data to {STREAMING_OUT}...")
    streaming_df.to_csv(STREAMING_OUT, index=False)
    
    print("Data split completed successfully.")

if __name__ == "__main__":
    split_data()
