from django.core.management.base import BaseCommand, CommandError
import os
import requests
from pathlib import Path
from tqdm import tqdm


class Command(BaseCommand):
    help = 'Download the Mistral 7B model for local LLM'
    
    # Model download URLs (using Hugging Face)
    MODEL_URLS = {
        'mistral-7b-instruct-v0.2.Q4_K_M': 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
        'mistral-7b-instruct-v0.2.Q5_K_M': 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q5_K_M.gguf',
        'mistral-7b-instruct-v0.2.Q3_K_S': 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q3_K_S.gguf',
    }
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            default='mistral-7b-instruct-v0.2.Q4_K_M',
            choices=list(self.MODEL_URLS.keys()),
            help='Model variant to download'
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default='models',
            help='Directory to save the model'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force download even if file exists'
        )
    
    def handle(self, *args, **options):
        model_name = options['model']
        output_dir = Path(options['output_dir'])
        force = options['force']
        
        # Create output directory
        output_dir.mkdir(exist_ok=True)
        
        # Model file path
        model_file = output_dir / f"{model_name}.gguf"
        
        # Check if already exists
        if model_file.exists() and not force:
            self.stdout.write(self.style.SUCCESS(f'Model already exists at {model_file}'))
            self.stdout.write('Use --force to re-download')
            return
        
        # Get URL
        url = self.MODEL_URLS[model_name]
        
        self.stdout.write(f'Downloading {model_name} from Hugging Face...')
        self.stdout.write(f'URL: {url}')
        self.stdout.write(f'Output: {model_file}')
        
        try:
            # Download with progress bar
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            
            with open(model_file, 'wb') as f:
                with tqdm(total=total_size, unit='B', unit_scale=True, desc=model_name) as pbar:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            pbar.update(len(chunk))
            
            self.stdout.write(self.style.SUCCESS(f'\nSuccessfully downloaded model to {model_file}'))
            
            # Update .env file
            env_file = Path('.env')
            if env_file.exists():
                with open(env_file, 'r') as f:
                    lines = f.readlines()
                
                # Update MODEL_PATH
                updated = False
                for i, line in enumerate(lines):
                    if line.startswith('MODEL_PATH='):
                        lines[i] = f'MODEL_PATH={model_file}\n'
                        updated = True
                        break
                
                if not updated:
                    lines.append(f'\nMODEL_PATH={model_file}\n')
                
                with open(env_file, 'w') as f:
                    f.writelines(lines)
                
                self.stdout.write(self.style.SUCCESS('Updated .env file with model path'))
            
            # Show model info
            file_size = model_file.stat().st_size / (1024 * 1024 * 1024)  # GB
            self.stdout.write(f'\nModel info:')
            self.stdout.write(f'  File: {model_file.name}')
            self.stdout.write(f'  Size: {file_size:.2f} GB')
            self.stdout.write(f'  Quantization: {model_name.split(".")[-1]}')
            
            self.stdout.write(self.style.SUCCESS('\nModel is ready to use!'))
            
        except requests.RequestException as e:
            raise CommandError(f'Error downloading model: {e}')
        except KeyboardInterrupt:
            self.stdout.write(self.style.ERROR('\nDownload cancelled'))
            if model_file.exists():
                model_file.unlink()
            raise CommandError('Download cancelled by user')