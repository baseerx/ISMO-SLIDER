from pathlib import Path

from django.conf import settings
from rest_framework import serializers

from .models import Slider


class SliderSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.username", read_only=True, default=None)
    updated_by_name = serializers.CharField(source="updated_by.username", read_only=True, default=None)

    class Meta:
        model = Slider
        fields = [
            "id", "name", "media_type", "image", "video", "description", "display_order", "display_duration",
            "show_caption", "is_active", "created_at", "updated_at", "created_by_name", "updated_by_name",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {"image": {"required": False}, "video": {"required": False}, "is_active": {"default": True}}

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Slider name is required.")
        return value

    def validate_description(self, value):
        limit = settings.SLIDER_MAX_DESCRIPTION
        if len(value) > limit:
            raise serializers.ValidationError(f"Description must not exceed {limit} characters.")
        return value.strip()

    def validate_display_order(self, value):
        if value < 1:
            raise serializers.ValidationError("Display order must be a positive number.")
        return value

    def validate_image(self, value):
        ext = Path(value.name).suffix.lower().lstrip(".")
        if ext not in settings.SLIDER_ALLOWED_EXTENSIONS:
            raise serializers.ValidationError("Image must be a JPG, JPEG, PNG or WEBP file.")
        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in settings.SLIDER_ALLOWED_CONTENT_TYPES:
            raise serializers.ValidationError("Unsupported image content type.")
        max_mb = settings.SLIDER_MAX_IMAGE_MB
        if value.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"Image size must be less than {max_mb} MB.")
        return value

    def validate_video(self, value):
        ext = Path(value.name).suffix.lower().lstrip(".")
        if ext not in settings.SLIDER_ALLOWED_VIDEO_EXTENSIONS:
            raise serializers.ValidationError("Video must be an MP4 or WEBM file.")
        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in settings.SLIDER_ALLOWED_VIDEO_CONTENT_TYPES:
            raise serializers.ValidationError("Unsupported video content type.")
        max_mb = settings.SLIDER_MAX_VIDEO_MB
        if value.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"Video size must be less than {max_mb} MB.")
        head = value.read(16)
        value.seek(0)
        if not (head[4:8] == b"ftyp" or head[:4] == b"\x1a\x45\xdf\xa3"):  # MP4 / WEBM signatures
            raise serializers.ValidationError("This file is not a valid MP4 or WEBM video.")
        return value

    def validate(self, attrs):
        """A slide needs an image OR a video (one is enough). The type follows the file provided."""
        inst = self.instance
        new_img, new_vid = attrs.get("image"), attrs.get("video")
        has_img = bool(new_img or (inst and inst.image))
        has_vid = bool(new_vid or (inst and inst.video))
        if not (has_img or has_vid):
            msg = "Add an image or a video."
            raise serializers.ValidationError({"image": msg, "video": msg})

        if new_vid:
            media = "video"
        elif new_img:
            media = "image"
        elif inst.media_type == "video" and inst.video or inst.media_type == "image" and inst.image:
            media = inst.media_type
        else:
            media = "video" if has_vid else "image"
        attrs["media_type"] = media

        limit = settings.SLIDER_MAX_VIDEO_DURATION if media == "video" else settings.SLIDER_MAX_DURATION
        duration = attrs.get("display_duration", inst.display_duration if inst else None)
        if duration is not None and not settings.SLIDER_MIN_DURATION <= duration <= limit:
            raise serializers.ValidationError(
                {"display_duration": f"Duration must be between {settings.SLIDER_MIN_DURATION} and {limit} seconds."})
        return attrs


class PublicSliderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slider
        fields = ["id", "name", "media_type", "image", "video", "description", "display_order", "display_duration", "show_caption"]


class StatusSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()


class ReorderSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)