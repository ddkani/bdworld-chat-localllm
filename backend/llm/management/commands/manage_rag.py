from django.core.management.base import BaseCommand, CommandError
from chat.models import RAGDocument
from llm.llm_service import RAGService
import json
import csv
from pathlib import Path
from tabulate import tabulate
import requests


class Command(BaseCommand):
    help = 'Manage RAG (Retrieval-Augmented Generation) documents'
    
    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest='subcommand', help='Sub-command help')
        
        # List documents
        list_parser = subparsers.add_parser('list', help='List all RAG documents')
        list_parser.add_argument('--active-only', action='store_true', help='Show only active documents')
        list_parser.add_argument('--limit', type=int, default=20, help='Limit number of results')
        
        # Add document
        add_parser = subparsers.add_parser('add', help='Add a new RAG document')
        add_parser.add_argument('--title', required=True, help='Document title')
        add_parser.add_argument('--content', help='Document content (text)')
        add_parser.add_argument('--file', help='Load content from file')
        add_parser.add_argument('--url', help='Load content from URL')
        add_parser.add_argument('--type', choices=['text', 'upload', 'url'], default='text', help='Source type')
        add_parser.add_argument('--tags', nargs='+', help='Tags for the document')
        add_parser.add_argument('--metadata', help='JSON metadata')
        
        # Import documents
        import_parser = subparsers.add_parser('import', help='Import documents from file')
        import_parser.add_argument('file', help='File to import (JSON, CSV, or TXT)')
        import_parser.add_argument('--format', choices=['json', 'csv', 'txt'], help='File format (auto-detected if not specified)')
        import_parser.add_argument('--title-prefix', help='Prefix for document titles')
        
        # Search documents
        search_parser = subparsers.add_parser('search', help='Search for similar documents')
        search_parser.add_argument('query', help='Search query')
        search_parser.add_argument('--limit', type=int, default=5, help='Number of results')
        
        # Delete document
        delete_parser = subparsers.add_parser('delete', help='Delete a RAG document')
        delete_parser.add_argument('document_id', type=int, help='Document ID')
        delete_parser.add_argument('--hard', action='store_true', help='Permanently delete')
        
        # Clear all documents
        clear_parser = subparsers.add_parser('clear', help='Clear all RAG documents')
        clear_parser.add_argument('--confirm', action='store_true', help='Confirm deletion')
        
        # Stats
        stats_parser = subparsers.add_parser('stats', help='Show RAG statistics')
    
    def handle(self, *args, **options):
        subcommand = options.get('subcommand')
        
        if subcommand == 'list':
            self.list_documents(options)
        elif subcommand == 'add':
            self.add_document(options)
        elif subcommand == 'import':
            self.import_documents(options)
        elif subcommand == 'search':
            self.search_documents(options)
        elif subcommand == 'delete':
            self.delete_document(options)
        elif subcommand == 'clear':
            self.clear_documents(options)
        elif subcommand == 'stats':
            self.show_stats(options)
        else:
            self.print_help('manage.py', 'manage_rag')
    
    def list_documents(self, options):
        """List all RAG documents"""
        queryset = RAGDocument.objects.all()
        
        if options['active_only']:
            queryset = queryset.filter(is_active=True)
        
        queryset = queryset[:options['limit']]
        
        if not queryset.exists():
            self.stdout.write(self.style.WARNING('No RAG documents found.'))
            return
        
        headers = ['ID', 'Title', 'Type', 'Content Preview', 'Tags', 'Active', 'Created']
        rows = []
        
        for doc in queryset:
            content_preview = doc.content[:50] + '...' if len(doc.content) > 50 else doc.content
            content_preview = content_preview.replace('\n', ' ')
            
            rows.append([
                doc.id,
                doc.title[:30] + '...' if len(doc.title) > 30 else doc.title,
                doc.source_type,
                content_preview,
                ', '.join(doc.tags) if doc.tags else '-',
                '✓' if doc.is_active else '✗',
                doc.created_at.strftime('%Y-%m-%d')
            ])
        
        self.stdout.write(tabulate(rows, headers=headers, tablefmt='grid'))
    
    def add_document(self, options):
        """Add a new RAG document"""
        title = options['title']
        source_type = options['type']
        
        # Get content based on source
        content = None
        source_path = None
        
        if options.get('content'):
            content = options['content']
        elif options.get('file'):
            source_path = options['file']
            try:
                with open(source_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                raise CommandError(f'Error reading file: {e}')
        elif options.get('url'):
            source_path = options['url']
            try:
                response = requests.get(source_path, timeout=30)
                response.raise_for_status()
                content = response.text
            except Exception as e:
                raise CommandError(f'Error fetching URL: {e}')
        else:
            raise CommandError('Must provide --content, --file, or --url')
        
        # Parse metadata
        metadata = {}
        if options.get('metadata'):
            try:
                metadata = json.loads(options['metadata'])
            except json.JSONDecodeError:
                raise CommandError('Invalid JSON metadata')
        
        # Create document
        doc = RAGDocument.objects.create(
            title=title,
            content=content,
            source_type=source_type,
            source_path=source_path,
            metadata=metadata,
            tags=options.get('tags') or []  # Default to empty list if None
        )
        
        # Add to RAG service
        rag_service = RAGService()
        rag_service.add_document(content, {
            'title': title,
            'id': doc.id,
            'tags': doc.tags
        })
        
        self.stdout.write(self.style.SUCCESS(f'Successfully added document "{title}" (ID: {doc.id})'))
    
    def import_documents(self, options):
        """Import documents from file"""
        file_path = Path(options['file'])
        
        if not file_path.exists():
            raise CommandError(f'File not found: {file_path}')
        
        # Detect format
        format_type = options.get('format')
        if not format_type:
            if file_path.suffix == '.json':
                format_type = 'json'
            elif file_path.suffix == '.csv':
                format_type = 'csv'
            else:
                format_type = 'txt'
        
        title_prefix = options.get('title_prefix', '')
        imported = 0
        
        try:
            if format_type == 'json':
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if not isinstance(data, list):
                    data = [data]
                
                for item in data:
                    title = (title_prefix or '') + item.get('title', f'Document {imported + 1}')
                    content = item.get('content', '')
                    
                    if not content:
                        self.stdout.write(self.style.WARNING(f'Skipping item without content'))
                        continue
                    
                    doc = RAGDocument.objects.create(
                        title=title,
                        content=content,
                        source_type='upload',
                        source_path=str(file_path),
                        metadata=item.get('metadata', {}),
                        tags=item.get('tags', [])
                    )
                    
                    # Add to RAG service
                    rag_service = RAGService()
                    rag_service.add_document(content, {
                        'title': title,
                        'id': doc.id
                    })
                    
                    imported += 1
            
            elif format_type == 'csv':
                with open(file_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    
                    for row in reader:
                        title = title_prefix + row.get('title', f'Document {imported + 1}')
                        content = row.get('content', '')
                        
                        if not content:
                            continue
                        
                        doc = RAGDocument.objects.create(
                            title=title,
                            content=content,
                            source_type='upload',
                            source_path=str(file_path),
                            tags=row.get('tags', '').split(',') if row.get('tags') else []
                        )
                        
                        # Add to RAG service
                        rag_service = RAGService()
                        rag_service.add_document(content, {
                            'title': title,
                            'id': doc.id
                        })
                        
                        imported += 1
            
            else:  # txt format - treat entire file as one document
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                title = title_prefix + file_path.stem
                doc = RAGDocument.objects.create(
                    title=title,
                    content=content,
                    source_type='upload',
                    source_path=str(file_path)
                )
                
                # Add to RAG service
                rag_service = RAGService()
                rag_service.add_document(content, {
                    'title': title,
                    'id': doc.id
                })
                
                imported = 1
        
        except Exception as e:
            raise CommandError(f'Error importing documents: {e}')
        
        self.stdout.write(self.style.SUCCESS(f'Successfully imported {imported} documents'))
    
    def search_documents(self, options):
        """Search for similar documents"""
        query = options['query']
        limit = options['limit']
        
        rag_service = RAGService()
        results = rag_service.search_similar(query, top_k=limit)
        
        if not results:
            self.stdout.write(self.style.WARNING('No similar documents found.'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'\nSearch results for: "{query}"\n'))
        
        for i, result in enumerate(results, 1):
            doc_id = result['metadata'].get('id')
            
            # Get document from database
            try:
                doc = RAGDocument.objects.get(id=doc_id)
                self.stdout.write(f"{i}. {doc.title}")
                self.stdout.write(f"   Similarity: {result['similarity']:.3f}")
                self.stdout.write(f"   Content: {result['content'][:100]}...")
                self.stdout.write(f"   Tags: {', '.join(doc.tags) if doc.tags else 'None'}")
                self.stdout.write("")
            except RAGDocument.DoesNotExist:
                self.stdout.write(f"{i}. [Document ID {doc_id} not found in database]")
    
    def delete_document(self, options):
        """Delete a RAG document"""
        doc_id = options['document_id']
        
        try:
            doc = RAGDocument.objects.get(id=doc_id)
        except RAGDocument.DoesNotExist:
            raise CommandError(f'Document with ID {doc_id} not found')
        
        if options.get('hard'):
            doc.delete()
            self.stdout.write(self.style.SUCCESS(f'Permanently deleted document "{doc.title}"'))
        else:
            doc.is_active = False
            doc.save()
            self.stdout.write(self.style.SUCCESS(f'Soft deleted document "{doc.title}"'))
    
    def clear_documents(self, options):
        """Clear all RAG documents"""
        if not options.get('confirm'):
            self.stdout.write(self.style.WARNING(
                'This will delete all RAG documents. Use --confirm to proceed.'
            ))
            return
        
        count = RAGDocument.objects.count()
        RAGDocument.objects.all().delete()
        
        # Also clear from RAG service database
        rag_service = RAGService()
        rag_service._init_db()  # This will recreate empty tables
        
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} documents'))
    
    def show_stats(self, options):
        """Show RAG statistics"""
        total = RAGDocument.objects.count()
        active = RAGDocument.objects.filter(is_active=True).count()
        
        by_type = {}
        for doc in RAGDocument.objects.all():
            by_type[doc.source_type] = by_type.get(doc.source_type, 0) + 1
        
        self.stdout.write(self.style.SUCCESS('\nRAG Document Statistics:\n'))
        self.stdout.write(f'Total documents: {total}')
        self.stdout.write(f'Active documents: {active}')
        self.stdout.write(f'Inactive documents: {total - active}')
        
        self.stdout.write('\nDocuments by type:')
        for source_type, count in by_type.items():
            self.stdout.write(f'  {source_type}: {count}')
        
        # Get top tags
        all_tags = {}
        for doc in RAGDocument.objects.filter(is_active=True):
            for tag in doc.tags:
                all_tags[tag] = all_tags.get(tag, 0) + 1
        
        if all_tags:
            self.stdout.write('\nTop tags:')
            sorted_tags = sorted(all_tags.items(), key=lambda x: x[1], reverse=True)[:10]
            for tag, count in sorted_tags:
                self.stdout.write(f'  {tag}: {count}')