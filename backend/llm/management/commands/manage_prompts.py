from django.core.management.base import BaseCommand, CommandError
from chat.models import PromptTemplate
from llm.llm_service import PromptTuningService
import json
from tabulate import tabulate


class Command(BaseCommand):
    help = 'Manage prompt templates for fine-tuning'
    
    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest='subcommand', help='Sub-command help')
        
        # List prompts
        list_parser = subparsers.add_parser('list', help='List all prompt templates')
        list_parser.add_argument('--active-only', action='store_true', help='Show only active templates')
        
        # Add prompt
        add_parser = subparsers.add_parser('add', help='Add a new prompt template')
        add_parser.add_argument('name', help='Template name')
        add_parser.add_argument('system_prompt', help='System prompt text')
        add_parser.add_argument('--description', help='Template description')
        add_parser.add_argument('--examples-file', help='JSON file with example conversations')
        
        # Update prompt
        update_parser = subparsers.add_parser('update', help='Update an existing prompt template')
        update_parser.add_argument('name', help='Template name')
        update_parser.add_argument('--system-prompt', help='New system prompt')
        update_parser.add_argument('--description', help='New description')
        update_parser.add_argument('--examples-file', help='JSON file with example conversations')
        
        # Delete prompt
        delete_parser = subparsers.add_parser('delete', help='Delete a prompt template')
        delete_parser.add_argument('name', help='Template name')
        delete_parser.add_argument('--hard', action='store_true', help='Permanently delete instead of soft delete')
        
        # Export prompts
        export_parser = subparsers.add_parser('export', help='Export prompt templates')
        export_parser.add_argument('--output', '-o', default='prompts_export.json', help='Output file')
        
        # Import prompts
        import_parser = subparsers.add_parser('import', help='Import prompt templates')
        import_parser.add_argument('file', help='JSON file to import')
        import_parser.add_argument('--overwrite', action='store_true', help='Overwrite existing templates')
    
    def handle(self, *args, **options):
        subcommand = options.get('subcommand')
        
        if subcommand == 'list':
            self.list_prompts(options)
        elif subcommand == 'add':
            self.add_prompt(options)
        elif subcommand == 'update':
            self.update_prompt(options)
        elif subcommand == 'delete':
            self.delete_prompt(options)
        elif subcommand == 'export':
            self.export_prompts(options)
        elif subcommand == 'import':
            self.import_prompts(options)
        else:
            self.print_help('manage.py', 'manage_prompts')
    
    def list_prompts(self, options):
        """List all prompt templates"""
        queryset = PromptTemplate.objects.all()
        
        if options['active_only']:
            queryset = queryset.filter(is_active=True)
        
        if not queryset.exists():
            self.stdout.write(self.style.WARNING('No prompt templates found.'))
            return
        
        headers = ['ID', 'Name', 'Description', 'Examples', 'Active', 'Created', 'Updated']
        rows = []
        
        for template in queryset:
            rows.append([
                template.id,
                template.name,
                template.description[:30] + '...' if len(template.description) > 30 else template.description,
                len(template.examples),
                '✓' if template.is_active else '✗',
                template.created_at.strftime('%Y-%m-%d'),
                template.updated_at.strftime('%Y-%m-%d')
            ])
        
        self.stdout.write(tabulate(rows, headers=headers, tablefmt='grid'))
    
    def add_prompt(self, options):
        """Add a new prompt template"""
        name = options['name']
        system_prompt = options['system_prompt']
        description = options.get('description', '')
        
        # Check if template already exists
        if PromptTemplate.objects.filter(name=name).exists():
            raise CommandError(f'Template "{name}" already exists')
        
        # Load examples if provided
        examples = []
        if options.get('examples_file'):
            try:
                with open(options['examples_file'], 'r') as f:
                    examples = json.load(f)
            except Exception as e:
                raise CommandError(f'Error loading examples file: {e}')
        
        # Create template
        template = PromptTemplate.objects.create(
            name=name,
            system_prompt=system_prompt,
            description=description or '',  # Default to empty string if None
            examples=examples
        )
        
        # Also add to PromptTuningService
        service = PromptTuningService()
        service.add_template(name, system_prompt, examples)
        
        self.stdout.write(self.style.SUCCESS(f'Successfully added prompt template "{name}"'))
    
    def update_prompt(self, options):
        """Update an existing prompt template"""
        name = options['name']
        
        try:
            template = PromptTemplate.objects.get(name=name)
        except PromptTemplate.DoesNotExist:
            raise CommandError(f'Template "{name}" does not exist')
        
        # Update fields if provided
        if options.get('system_prompt'):
            template.system_prompt = options['system_prompt']
        
        if options.get('description') is not None:
            template.description = options['description']
        
        if options.get('examples_file'):
            try:
                with open(options['examples_file'], 'r') as f:
                    template.examples = json.load(f)
            except Exception as e:
                raise CommandError(f'Error loading examples file: {e}')
        
        template.save()
        
        # Update in PromptTuningService
        service = PromptTuningService()
        service.update_template(
            name,
            template.system_prompt,
            template.examples
        )
        
        self.stdout.write(self.style.SUCCESS(f'Successfully updated prompt template "{name}"'))
    
    def delete_prompt(self, options):
        """Delete a prompt template"""
        name = options['name']
        
        try:
            template = PromptTemplate.objects.get(name=name)
        except PromptTemplate.DoesNotExist:
            raise CommandError(f'Template "{name}" does not exist')
        
        if options.get('hard'):
            template.delete()
            self.stdout.write(self.style.SUCCESS(f'Permanently deleted prompt template "{name}"'))
        else:
            template.is_active = False
            template.save()
            self.stdout.write(self.style.SUCCESS(f'Soft deleted prompt template "{name}"'))
    
    def export_prompts(self, options):
        """Export prompt templates to JSON"""
        templates = PromptTemplate.objects.filter(is_active=True)
        
        data = []
        for template in templates:
            data.append({
                'name': template.name,
                'description': template.description,
                'system_prompt': template.system_prompt,
                'examples': template.examples
            })
        
        output_file = options['output']
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        self.stdout.write(self.style.SUCCESS(f'Exported {len(data)} templates to {output_file}'))
    
    def import_prompts(self, options):
        """Import prompt templates from JSON"""
        import_file = options['file']
        overwrite = options.get('overwrite', False)
        
        try:
            with open(import_file, 'r') as f:
                data = json.load(f)
        except Exception as e:
            raise CommandError(f'Error reading import file: {e}')
        
        imported = 0
        skipped = 0
        
        for item in data:
            name = item.get('name')
            if not name:
                self.stdout.write(self.style.WARNING('Skipping item without name'))
                continue
            
            exists = PromptTemplate.objects.filter(name=name).exists()
            
            if exists and not overwrite:
                skipped += 1
                self.stdout.write(self.style.WARNING(f'Skipping existing template "{name}"'))
                continue
            
            if exists:
                template = PromptTemplate.objects.get(name=name)
                template.system_prompt = item.get('system_prompt', '')
                template.description = item.get('description', '')
                template.examples = item.get('examples', [])
                template.save()
            else:
                PromptTemplate.objects.create(
                    name=name,
                    system_prompt=item.get('system_prompt', ''),
                    description=item.get('description', ''),
                    examples=item.get('examples', [])
                )
            
            imported += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'Import complete: {imported} imported, {skipped} skipped'
        ))