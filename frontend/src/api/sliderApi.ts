import { Paginated, PublicSlider, Slider, SliderFormValues, StatusFilter } from '../types';
import axios from 'axios';
import { API_BASE, api } from './axios';

export function toFormData(v: SliderFormValues): FormData {
  const fd = new FormData();
  fd.append('name', v.name);
  fd.append('description', v.description);
  fd.append('display_order', String(v.display_order));
  fd.append('display_duration', String(v.display_duration));
  fd.append('is_active', String(v.is_active));
  fd.append('show_caption', String(v.show_caption));
  fd.append('media_type', v.media_type);
  if (v.image) fd.append('image', v.image);
  if (v.video) fd.append('video', v.video);
  return fd;
}

export const sliderApi = {
  list: (p: { search?: string; status?: StatusFilter; ordering?: string; page_size?: number }) =>
    api.get<Paginated<Slider>>('/sliders/', {
      params: { ...p, status: p.status === 'all' ? undefined : p.status, search: p.search || undefined },
    }).then((r) => r.data),
  // Public feed for display screens: plain axios, so no token is sent and an expired
  // session can never trigger the refresh/redirect-to-login interceptor.
  active: () => axios.get<PublicSlider[]>(`${API_BASE}/sliders/active/`, { timeout: 20000 }).then((r) => r.data),
  create: (v: SliderFormValues) => api.post<Slider>('/sliders/', toFormData(v)).then((r) => r.data),
  update: (id: number, v: SliderFormValues) => api.patch<Slider>(`/sliders/${id}/`, toFormData(v)).then((r) => r.data),
  remove: (id: number) => api.delete(`/sliders/${id}/`),
  setStatus: (id: number, is_active: boolean) => api.patch<Slider>(`/sliders/${id}/status/`, { is_active }).then((r) => r.data),
  reorder: (ids: number[]) => api.patch<Slider[]>('/sliders/reorder/', { ids }).then((r) => r.data),
};