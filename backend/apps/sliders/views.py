from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from . import services
from .models import Slider
from .serializers import (
    PublicSliderSerializer, ReorderSerializer, SliderSerializer, StatusSerializer,
)

SORT_FIELDS = {"display_order", "name", "created_at", "updated_at"}


class SliderViewSet(viewsets.ModelViewSet):


    serializer_class = SliderSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action == "active":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Slider.objects.select_related("created_by", "updated_by")
        p = self.request.query_params
        if search := p.get("search"):
            qs = qs.filter(name__icontains=search.strip())
        status_filter = p.get("status")
        if status_filter == "active":
            qs = qs.filter(is_active=True)
        elif status_filter == "inactive":
            qs = qs.filter(is_active=False)
        ordering = p.get("ordering", "display_order")
        if ordering.lstrip("-") in SORT_FIELDS:
            qs = qs.order_by(ordering, "id")
        return qs

    def perform_create(self, serializer):
        serializer.instance = services.create_slider(serializer, self.request.user)

    def perform_update(self, serializer):
        serializer.instance = services.update_slider(serializer, self.request.user)

    def perform_destroy(self, instance):
        services.delete_slider(instance)

    @action(detail=False, methods=["get"], pagination_class=None)
    def active(self, request):
        qs = Slider.objects.filter(is_active=True).order_by("display_order", "id")
        data = PublicSliderSerializer(qs, many=True, context={"request": request}).data
        return Response(data)

    @action(detail=True, methods=["patch"], url_path="status")
    def set_status(self, request, pk=None):
        slider = self.get_object()
        serializer = StatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slider.is_active = serializer.validated_data["is_active"]
        slider.updated_by = request.user
        slider.save(update_fields=["is_active", "updated_by", "updated_at"])
        return Response(self.get_serializer(slider).data)

    @action(detail=False, methods=["patch"], pagination_class=None)
    def reorder(self, request):
        serializer = ReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reorder_sliders(serializer.validated_data["ids"], request.user)
        qs = Slider.objects.select_related("created_by", "updated_by").order_by("display_order", "id")
        return Response(self.get_serializer(qs, many=True).data, status=status.HTTP_200_OK)
