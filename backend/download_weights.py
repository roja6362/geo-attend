import os
import urllib.request
import sys

def progress_hook(count, block_size, total_size):
    percent = int(count * block_size * 100 / total_size)
    percent = min(percent, 100)
    sys.stdout.write(f"\rDownloading... {percent}% ({count * block_size // 1024 // 1024}MB / {total_size // 1024 // 1024}MB)")
    sys.stdout.flush()

def download_weights():
    weights_dir = os.path.expanduser('~/.deepface/weights')
    os.makedirs(weights_dir, exist_ok=True)
    file_path = os.path.join(weights_dir, 'facenet_weights.h5')
    
    if os.path.exists(file_path) and os.path.getsize(file_path) > 10000000:
        print(f"Facenet weights already present and verified at {file_path}")
        return True
    
    urls = [
        "https://huggingface.co/junjiang/GestureFace/resolve/main/facenet_weights.h5",
        "https://github.com/serengil/deepface_models/releases/download/v1.0/facenet_weights.h5"
    ]
    
    opener = urllib.request.build_opener()
    opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')]
    urllib.request.install_opener(opener)
    
    success = False
    for url in urls:
        print(f"\nTrying to download from: {url}")
        try:
            urllib.request.urlretrieve(url, file_path, reporthook=progress_hook)
            print("\nDownload complete successfully!")
            success = True
            break
        except Exception as e:
            print(f"\nFailed to download from this source: {e}")
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except:
                    pass

    if not success:
        print("\nAll download attempts failed. Please download the file manually.")

if __name__ == "__main__":
    download_weights()
