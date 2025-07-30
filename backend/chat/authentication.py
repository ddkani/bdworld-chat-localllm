from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from rest_framework.authentication import SessionAuthentication

User = get_user_model()


class UsernameOnlyBackend(BaseBackend):
    """
    Custom authentication backend that authenticates users based on username only.
    No password is required.
    """
    
    def authenticate(self, request, username=None, **kwargs):
        if username is None or username == '':
            return None
        
        try:
            # Try to get existing user
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # Create new user if doesn't exist
            user = User.objects.create_user(username=username)
        
        return user
    
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication subclass that doesn't enforce CSRF
    """
    def enforce_csrf(self, request):
        """
        Override to disable CSRF check
        """
        return  # Don't enforce CSRF