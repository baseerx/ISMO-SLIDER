
from django.db import transaction

from .exceptions import Conflict
from .models import Slider


def _renumber(sliders):
    changed = []
    for index, slider in enumerate(sliders, start=1):
        if slider.display_order != index:
            slider.display_order = index
            changed.append(slider)
    if changed:
        Slider.objects.bulk_update(changed, ["display_order"])


def place(slider, position):
    others = list(Slider.objects.exclude(pk=slider.pk).order_by("display_order", "id"))
    index = max(1, min(position, len(others) + 1)) - 1
    others.insert(index, slider)
    _renumber(others)


def _drop_unused_media(slider):
    field = "image" if slider.media_type == Slider.MEDIA_VIDEO else "video"
    unused = getattr(slider, field)
    if unused:
        name, storage = unused.name, unused.storage
        setattr(slider, field, "")
        slider.save(update_fields=[field])
        transaction.on_commit(lambda: storage.delete(name))


@transaction.atomic
def create_slider(serializer, user):
    requested = serializer.validated_data.pop("display_order")
    total = Slider.objects.count()
    slider = serializer.save(display_order=total + 1, created_by=user, updated_by=user)
    _drop_unused_media(slider)
    place(slider, requested)
    slider.refresh_from_db()
    return slider


def _file_names(slider):
    return {f: (getattr(slider, f).name or None) for f in ("image", "video")}


@transaction.atomic
def update_slider(serializer, user):
    old = _file_names(serializer.instance)
    requested = serializer.validated_data.pop("display_order", None)
    slider = serializer.save(updated_by=user)
    if slider.media_type == Slider.MEDIA_IMAGE and slider.video:  
        slider.video = ""
        slider.save(update_fields=["video"])
    elif slider.media_type == Slider.MEDIA_VIDEO and slider.image:  
        slider.image = ""
        slider.save(update_fields=["image"])
    if requested is not None and requested != slider.display_order:
        place(slider, requested)
    new = _file_names(slider)
    storage = slider.image.storage
    for field, name in old.items():
        if name and name != new[field]:
            transaction.on_commit(lambda n=name: storage.delete(n))
    slider.refresh_from_db()
    return slider


@transaction.atomic
def delete_slider(slider):
    names = [n for n in _file_names(slider).values() if n]
    storage = slider.image.storage
    slider.delete()
    _renumber(list(Slider.objects.order_by("display_order", "id")))
    for name in names:
        transaction.on_commit(lambda n=name: storage.delete(n))


@transaction.atomic
def reorder_sliders(ordered_ids, user):
    existing = set(Slider.objects.values_list("id", flat=True))
    if len(ordered_ids) != len(set(ordered_ids)) or set(ordered_ids) != existing:
        raise Conflict("The slider list is out of date. Refresh and try again.")
    by_id = {s.id: s for s in Slider.objects.select_for_update().filter(id__in=ordered_ids)}
    ordered = [by_id[i] for i in ordered_ids]
    for slider in ordered:
        slider.updated_by = user
    Slider.objects.bulk_update(ordered, ["updated_by"])
    _renumber(ordered)