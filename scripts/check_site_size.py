import fire
import os
from glob import glob

LOADING_FILE_THRESHOLD = 7_000
OTHER_SIZE_THRESHOLD = 3_500_000
LOADING_FILE = 'scripts/loading.js'

def check_site_size(directory):
    """Check the total size of a directory."""
    if not os.path.isdir(directory):
        raise ValueError(f"{directory} is not a valid directory.")
    
    loading_file_path = os.path.join(directory, LOADING_FILE)
    loading_file_size = os.path.getsize(loading_file_path)
    print(f"Size of '{LOADING_FILE}': {loading_file_size} bytes")
    if loading_file_size > LOADING_FILE_THRESHOLD:
        print(f"\033[91mError: '{LOADING_FILE}' exceeds the threshold of {LOADING_FILE_THRESHOLD} bytes.\033[0m")
        exit(1)
    
    total_size = 0
    for f in glob(os.path.join(directory, 'scripts', '**', '*.js'), recursive=True):
        if f != LOADING_FILE:
            total_size += os.path.getsize(f)
    
    print(f"Total size of '{directory}' (excluding '{LOADING_FILE}'): {total_size} bytes")
    if (total_size > OTHER_SIZE_THRESHOLD):
        print(f"\033[91mError: Total scripts size exceeds the threshold of {OTHER_SIZE_THRESHOLD} bytes.\033[0m")
        exit(1)

if __name__ == "__main__":
    fire.Fire(check_site_size)