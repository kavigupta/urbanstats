# US Election Data 2008-2012

This directory contains scripts to download and merge election data from Dave's Redistricting App's block_data repository.

## Source

Data is sourced from the [dra2020/block_data](https://github.com/dra2020/block_data) repository on GitHub, specifically from the `2020_Geography` folder.

## Usage

Run the download and merge script:

```bash
python download_and_merge.py
```

The script will:
1. Connect to the GitHub repository
2. For each state folder, find the latest `Election_Data_Block_*.md` file
3. Extract the CSV download link from the markdown file
4. Download all CSVs to the `downloads/` folder
5. Merge them into a single `merged_election_data.csv` file

## Requirements

Install required Python packages:

```bash
pip install pandas requests tqdm
```

## Output

- `downloads/`: Directory containing individual state CSV files
- `merged_election_data.csv`: Merged CSV file with all state data

## Notes

- The script uses the GitHub API to discover state folders and files
- It automatically finds the latest version of each state's election data file
- If a download fails for a state, it will be reported but the script will continue
- ZIP files are automatically extracted to find CSV files

## License

Please refer to the original repository for license information. According to the dra2020/block_data repository:

> YOU ARE RESPONSIBLE FOR READING AND UNDERSTANDING THE LICENSES FOR THIS DATA, INCLUDING INDIVIDUAL DATASET LICENSES IF ANY.
> 
> YOU AGREE NOT TO SELL ANY OF THIS DATA UNDER ANY CIRCUMSTANCES.

Most election data was obtained from Voting and Election Science Team and is available under the Creative Commons Attribution license (CC BY 4.0).

