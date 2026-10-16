import uuid
from pathlib import Path

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


def slider_image_path(instance, filename):
    ext = Path(filename).suffix.lower()
    return f"sliders/{uuid.uuid4().hex}{ext}"


def slider_video_path(instance, filename):
    return f"sliders/videos/{uuid.uuid4().hex}{Path(filename).suffix.lower()}"


class Slider(models.Model):
    MEDIA_IMAGE, MEDIA_VIDEO = "image", "video"
    MEDIA_CHOICES = [(MEDIA_IMAGE, "Image"), (MEDIA_VIDEO, "Video")]

    name = models.CharField(max_length=150)
    media_type = models.CharField(max_length=5, choices=MEDIA_CHOICES, default=MEDIA_IMAGE)
    image = models.ImageField(upload_to=slider_image_path, blank=True)
    video = models.FileField(upload_to=slider_video_path, blank=True)
    description = models.CharField(max_length=1000, blank=True)
    display_order = models.PositiveIntegerField(db_index=True)
    display_duration = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1)],  # upper limit depends on media type: enforced in the serializer
        help_text="Seconds the slide stays visible (video length for video slides).",
    )
    show_caption = models.BooleanField(default=False, help_text="Show the name and description over the slide.")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="sliders_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="sliders_updated",
    )

    class Meta:
        ordering = ["display_order", "id"]
        constraints = [
            models.CheckConstraint(check=models.Q(display_order__gte=1), name="slider_order_positive"),
        ]
        indexes = [models.Index(fields=["is_active", "display_order"], name="slider_active_order_idx")]

    def __str__(self):
        return f"{self.display_order}. {self.name}"