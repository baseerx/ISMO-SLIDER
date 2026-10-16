export interface Slider {
  id: number; name: string; media_type: 'image' | 'video'; image: string | null; video: string | null; description: string;
  display_order: number; display_duration: number; show_caption: boolean; is_active: boolean;
  created_at: string; updated_at: string;
  created_by_name: string | null; updated_by_name: string | null;
}
export type PublicSlider = Pick<Slider, 'id' | 'name' | 'media_type' | 'image' | 'video' | 'description' | 'display_order' | 'display_duration' | 'show_caption'>;
export interface AuthUser { id: number; username: string; email: string; first_name: string; last_name: string; is_staff: boolean }
export interface LoginResponse { access: string; refresh: string; user: AuthUser }
export interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[] }
export type StatusFilter = 'all' | 'active' | 'inactive';
export interface SliderFormValues { name: string; description: string; display_order: number; display_duration: number; show_caption: boolean; is_active: boolean; media_type: 'image' | 'video'; image: File | null; video: File | null }
export type ApiErrorBody = { detail?: string } & Record<string, string | string[] | undefined>;