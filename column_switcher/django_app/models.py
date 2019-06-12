from django.db import models


class SwitchProtocol(models.Model):
    profile = models.TextField()
    created_date = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)