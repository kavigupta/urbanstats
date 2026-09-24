#!/usr/bin/env python3
"""
Download and merge election data from Dave's Redistricting App block_data repository.

This script:
1. Connects to https://github.com/dra2020/block_data/tree/main
2. For each state folder, finds the latest Election_Data_Block_*.md file
3. Extracts the CSV download link from the markdown
4. Downloads all CSVs to a downloads folder
5. Merges them into a single CSV file
"""

import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
import requests
from tqdm import tqdm

# GitHub API base URL
GITHUB_API_BASE = "https://api.github.com/repos/dra2020/block_data/contents"
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/dra2020/block_data/main"

# State abbreviations (including DC)
STATES = [
    "AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA",
    "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME",
    "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM",
    "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
    "UT", "VA", "VT", "WA", "WI", "WV", "WY"
]


def get_state_folders():
    """Get list of state folders from the GitHub repository."""
    try:
        response = requests.get(f"{GITHUB_API_BASE}/2020_Geography", timeout=30)
        response.raise_for_status()
        contents = response.json()
        
        # Filter for directories that look like state folders
        state_folders = []
        for item in contents:
            if item["type"] == "dir":
                folder_name = item["name"]
                # Check if it's a state folder (usually 2-letter codes or full state names)
                if len(folder_name) == 2 and folder_name.upper() in STATES:
                    state_folders.append(folder_name.upper())
                elif folder_name.upper() in [s.upper() for s in STATES]:
                    state_folders.append(folder_name)
        
        return sorted(state_folders)
    except Exception as e:
        print(f"Error fetching state folders: {e}")
        print("Falling back to hardcoded state list...")
        return STATES


def find_election_data_files(state_folder):
    """
    Find all Election_Data_Block_*.md files for a state, sorted by version.
    
    Returns a list of filenames sorted by version (latest first), or empty list if not found.
    """
    try:
        response = requests.get(
            f"{GITHUB_API_BASE}/2020_Geography/{state_folder}",
            timeout=30
        )
        response.raise_for_status()
        contents = response.json()
        
        # Find all Election_Data_Block_*.md files
        election_files = []
        for item in contents:
            if item["type"] == "file":
                filename = item["name"]
                if filename.startswith("Election_Data_Block_") and filename.endswith(".md"):
                    election_files.append(filename)
        
        if not election_files:
            return []
        
        # Sort to find the latest version (assuming version numbers in filename)
        # Format: Election_Data_Block_XX.v##.md
        def extract_version(filename):
            match = re.search(r'\.v(\d+)\.md$', filename)
            return int(match.group(1)) if match else 0
        
        election_files.sort(key=extract_version, reverse=True)
        return election_files
    
    except Exception as e:
        print(f"Error finding election data files for {state_folder}: {e}")
        return []


def find_latest_election_data_file(state_folder):
    """
    Find the latest Election_Data_Block_*.md file for a state.
    
    Returns the filename of the latest version, or None if not found.
    """
    files = find_election_data_files(state_folder)
    return files[0] if files else None


def extract_csv_link_from_markdown(state_folder, markdown_filename):
    """
    Extract the CSV download link from the markdown file.
    
    Returns the URL to download the CSV, or None if not found.
    """
    try:
        markdown_url = f"{GITHUB_RAW_BASE}/2020_Geography/{state_folder}/{markdown_filename}"
        response = requests.get(markdown_url, timeout=30)
        response.raise_for_status()
        content = response.text
        
        # Look for download links in the markdown
        # Common patterns: [Download](url) or direct links
        # Also check for links to zip files that contain CSVs
        patterns = [
            r'\[Download\]\((https?://[^\)]+\.(csv|zip))\)',  # [Download](url.csv)
            r'\[.*?\]\((https?://[^\)]+\.(csv|zip))\)',  # [text](url.csv)
            r'(https?://[^\s\)]+\.(csv|zip))',  # Direct URL
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                url = match[0] if isinstance(match, tuple) else match
                if url and (url.endswith('.csv') or url.endswith('.zip')):
                    return url
        
        # If no direct link found, check for GitHub release or other download patterns
        # Some markdown files might reference releases
        release_pattern = r'releases/download/[^/]+/([^\)]+\.(csv|zip))'
        release_matches = re.findall(release_pattern, content, re.IGNORECASE)
        if release_matches:
            filename = release_matches[0][0]
            # Try to construct release URL (this might need adjustment based on actual format)
            return f"https://github.com/dra2020/block_data/releases/download/latest/{filename}"
        
        return None
    
    except Exception as e:
        print(f"Error extracting CSV link from {markdown_filename}: {e}")
        return None


def download_file(url, output_path):
    """Download a file from URL to output_path."""
    try:
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        
        with open(output_path, 'wb') as f:
            if total_size == 0:
                f.write(response.content)
            else:
                with tqdm(total=total_size, unit='B', unit_scale=True, desc=output_path.name) as pbar:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            pbar.update(len(chunk))
        
        return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False


def extract_csv_from_zip(zip_path, output_dir):
    """Extract CSV file from zip archive."""
    import zipfile
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Find CSV files in the zip
            csv_files = [f for f in zip_ref.namelist() if f.endswith('.csv')]
            
            if not csv_files:
                return None
            
            # Extract the first CSV (or largest if multiple)
            csv_file = csv_files[0]
            if len(csv_files) > 1:
                # Use the largest file
                csv_file = max(csv_files, key=lambda f: zip_ref.getinfo(f).file_size)
            
            output_path = output_dir / csv_file.split('/')[-1]
            with zip_ref.open(csv_file) as source, open(output_path, 'wb') as target:
                target.write(source.read())
            
            return output_path
    except Exception as e:
        print(f"Error extracting CSV from {zip_path}: {e}")
        return None


def merge_csvs(download_dir, output_file):
    """Merge all CSV files in download_dir into a single CSV, keeping only columns with 'PRES' in the name."""
    csv_files = sorted(download_dir.glob("*.csv"))
    
    if not csv_files:
        print("No CSV files found to merge!")
        return False
    
    print(f"\nMerging {len(csv_files)} CSV files...")
    print("Filtering to keep only columns containing 'PRES'...")
    
    dataframes = []
    all_pres_columns = set()
    
    for csv_file in tqdm(csv_files, desc="Loading CSVs"):
        try:
            df = pd.read_csv(csv_file, low_memory=False)
            
            # Filter to only columns containing 'PRES' (case-insensitive)
            pres_columns = [col for col in df.columns if 'PRES' in col.upper()]
            all_pres_columns.update(pres_columns)
            
            if not pres_columns:
                print(f"  ⚠️  Warning: No PRES columns found in {csv_file.name}")
                continue
            
            # Keep only PRES columns plus any identifier columns we need
            # Also keep GEOID or similar identifier columns if they exist
            identifier_cols = []
            for col in df.columns:
                col_upper = col.upper()
                if col_upper in ['GEOID', 'GEO_ID', 'BLOCK', 'BLOCKID', 'FIPS'] or 'GEO' in col_upper:
                    identifier_cols.append(col)
            
            cols_to_keep = list(set(pres_columns + identifier_cols))
            df_filtered = df[cols_to_keep].copy()
            
            # Always extract state from filename to ensure consistency
            # Filenames are like "election_data_block_AK.v07.csv"
            filename_upper = csv_file.stem.upper()
            state_code = None
            
            # Pattern: "ELECTION_DATA_BLOCK_XX.V##" -> extract XX (2-letter state code before .V)
            # This is the most reliable pattern for these files
            match = re.search(r'_([A-Z]{2})\.V\d+', filename_upper)
            if match:
                potential_state = match.group(1)
                if potential_state in STATES:
                    state_code = potential_state
            
            # Fallback: try to find state code anywhere in filename
            if not state_code:
                for state in STATES:
                    # Look for state code as a word boundary (not part of another word)
                    # Patterns: "_AK.", "_AK_", "AK.v", or at start/end
                    if (f"_{state}." in filename_upper or 
                        f"_{state}_" in filename_upper or 
                        f"{state}." in filename_upper or
                        filename_upper.startswith(f"{state}_") or 
                        filename_upper.endswith(f"_{state}")):
                        state_code = state
                        break
            
            # Last resort: try first 2 characters if they look like a state code
            if not state_code:
                potential_state = filename_upper[:2]
                if potential_state in STATES:
                    state_code = potential_state
            
            # Always add STATE column with the extracted state code
            if state_code:
                df_filtered['STATE'] = state_code
            else:
                print(f"  ⚠️  Warning: Could not determine state for {csv_file.name}, using 'UNKNOWN'")
                df_filtered['STATE'] = 'UNKNOWN'
            
            dataframes.append(df_filtered)
        except Exception as e:
            print(f"Error reading {csv_file}: {e}")
            continue
    
    if not dataframes:
        print("No valid CSV files to merge!")
        return False
    
    # Merge all dataframes
    print("Concatenating dataframes...")
    merged_df = pd.concat(dataframes, ignore_index=True)
    
    # Save merged CSV
    print(f"Saving merged CSV to {output_file}...")
    merged_df.to_csv(output_file, index=False)
    
    print(f"\nMerged CSV saved: {output_file}")
    print(f"Total rows: {len(merged_df):,}")
    print(f"Total columns: {len(merged_df.columns)}")
    print(f"PRES columns found: {len([c for c in merged_df.columns if 'PRES' in c.upper()])}")
    
    return True


def main():
    """Main function to download and merge election data."""
    script_dir = Path(__file__).parent
    download_dir = script_dir / "downloads"
    download_dir.mkdir(exist_ok=True)
    
    output_file = script_dir / "merged_election_data.csv"
    
    print("Fetching state folders from GitHub...")
    state_folders = get_state_folders()
    print(f"Found {len(state_folders)} state folders")
    
    downloaded_files = []
    failed_states = []
    
    print("\nDownloading election data files...")
    for state_folder in tqdm(state_folders, desc="Processing states"):
        # First check if CSV already exists - skip all API calls and downloads if it does
        # Check for files with state code in the name (case-insensitive)
        existing_csv = []
        for csv_file in download_dir.glob("*.csv"):
            # Check if state code appears in filename (handles various naming patterns)
            if state_folder.upper() in csv_file.stem.upper():
                existing_csv.append(csv_file)
                break
        
        if existing_csv:
            print(f"  ✓ CSV already exists for {state_folder}: {existing_csv[0].name}, skipping")
            downloaded_files.append(existing_csv[0])
            continue
        
        # Find all election data markdown files (sorted by version)
        election_files = find_election_data_files(state_folder)
        
        if not election_files:
            print(f"  ⚠️  No election data file found for {state_folder}")
            failed_states.append(state_folder)
            continue
        
        # Try each version from latest to oldest until one works
        downloaded = False
        for markdown_file in election_files:
            print(f"  📄 Trying {markdown_file} for {state_folder}")
            
            # Extract CSV download link
            csv_url = extract_csv_link_from_markdown(state_folder, markdown_file)
            
            if not csv_url:
                print(f"  ⚠️  No CSV link found in {markdown_file}, trying next version...")
                continue
            
            # Determine output filename
            parsed_url = urlparse(csv_url)
            url_filename = os.path.basename(parsed_url.path)
            
            if not url_filename or '.' not in url_filename:
                url_filename = f"{state_folder}_election_data.csv"
            
            output_path = download_dir / url_filename
            
            # Check if file already exists (either as zip or extracted CSV)
            final_csv_path = None
            if output_path.suffix == '.zip':
                # For zip files, check if extracted CSV already exists
                # Try to find existing CSV with state prefix
                possible_csv_names = [
                    download_dir / f"{state_folder}_{url_filename.replace('.zip', '.csv')}",
                    download_dir / url_filename.replace('.zip', '.csv'),
                ]
                # Also check for any CSV file that might have been extracted from this zip
                for existing_csv in download_dir.glob(f"{state_folder}_*.csv"):
                    if existing_csv.exists():
                        possible_csv_names.append(existing_csv)
                
                for csv_name in possible_csv_names:
                    if csv_name.exists():
                        final_csv_path = csv_name
                        print(f"  ✓ CSV already exists: {final_csv_path.name}, skipping download")
                        downloaded_files.append(final_csv_path)
                        downloaded = True
                        break
            else:
                # For direct CSV files, check if it exists
                if state_folder not in output_path.stem.upper():
                    new_name = f"{state_folder}_{output_path.name}"
                    new_path = download_dir / new_name
                    if new_path.exists():
                        final_csv_path = new_path
                        print(f"  ✓ CSV already exists: {final_csv_path.name}, skipping download")
                        downloaded_files.append(final_csv_path)
                        downloaded = True
                        break
                elif output_path.exists():
                    final_csv_path = output_path
                    print(f"  ✓ CSV already exists: {final_csv_path.name}, skipping download")
                    downloaded_files.append(final_csv_path)
                    downloaded = True
                    break
            
            if final_csv_path:
                break
            
            # Download the file if it doesn't exist
            print(f"  ⬇️  Downloading {state_folder}...")
            if download_file(csv_url, output_path):
                # If it's a zip file, extract the CSV
                if output_path.suffix == '.zip':
                    csv_path = extract_csv_from_zip(output_path, download_dir)
                    if csv_path:
                        # Remove the zip file
                        output_path.unlink()
                        output_path = csv_path
                    else:
                        print(f"  ⚠️  Could not extract CSV from {output_path}, trying next version...")
                        continue
                else:
                    # Rename to include state code if not already present
                    if state_folder not in output_path.stem.upper():
                        new_name = f"{state_folder}_{output_path.name}"
                        new_path = download_dir / new_name
                        output_path.rename(new_path)
                        output_path = new_path
                
                downloaded_files.append(output_path)
                print(f"  ✅ Downloaded {state_folder}")
                downloaded = True
                break
            else:
                print(f"  ⚠️  Download failed, trying next version...")
                continue
        
        if not downloaded:
            print(f"  ❌ Failed to download {state_folder} from all available versions")
            failed_states.append(state_folder)
    
    print(f"\n✅ Successfully downloaded {len(downloaded_files)} files")
    if failed_states:
        print(f"⚠️  Failed to download {len(failed_states)} states: {', '.join(failed_states)}")
    
    # Merge all downloaded CSVs
    if downloaded_files:
        merge_csvs(download_dir, output_file)
    else:
        print("\n❌ No files downloaded. Cannot merge.")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

