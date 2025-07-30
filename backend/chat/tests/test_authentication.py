from django.test import TestCase
from django.contrib.auth import authenticate, get_user_model
from chat.authentication import UsernameOnlyBackend

User = get_user_model()


class UsernameOnlyBackendTest(TestCase):
    """Test custom authentication backend"""
    
    def setUp(self):
        self.backend = UsernameOnlyBackend()
        
    def test_authenticate_new_user(self):
        """Test authenticating a new user creates the user"""
        user = self.backend.authenticate(None, username='newuser')
        
        self.assertIsNotNone(user)
        self.assertEqual(user.username, 'newuser')
        self.assertTrue(User.objects.filter(username='newuser').exists())
        
    def test_authenticate_existing_user(self):
        """Test authenticating an existing user"""
        existing_user = User.objects.create_user(username='existinguser')
        
        user = self.backend.authenticate(None, username='existinguser')
        
        self.assertIsNotNone(user)
        self.assertEqual(user.id, existing_user.id)
        self.assertEqual(user.username, 'existinguser')
        
    def test_authenticate_without_username(self):
        """Test authentication fails without username"""
        user = self.backend.authenticate(None)
        self.assertIsNone(user)
        
        user = self.backend.authenticate(None, username=None)
        self.assertIsNone(user)
        
        user = self.backend.authenticate(None, username='')
        self.assertIsNone(user)
        
    def test_get_user(self):
        """Test getting user by ID"""
        user = User.objects.create_user(username='testuser')
        
        retrieved_user = self.backend.get_user(user.id)
        self.assertEqual(retrieved_user.id, user.id)
        
    def test_get_user_invalid_id(self):
        """Test getting user with invalid ID"""
        user = self.backend.get_user(99999)
        self.assertIsNone(user)
        
    def test_django_authenticate_function(self):
        """Test Django's authenticate function with our backend"""
        # This tests the integration with Django's auth system
        user = authenticate(username='djangouser')
        
        self.assertIsNotNone(user)
        self.assertEqual(user.username, 'djangouser')
        self.assertTrue(User.objects.filter(username='djangouser').exists())