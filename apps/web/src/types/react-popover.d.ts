import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    popover?: 'auto' | 'manual' | '';
  }
  interface ButtonHTMLAttributes<T> {
    popovertarget?: string;
    popovertargetaction?: 'toggle' | 'show' | 'hide';
  }
  interface ImgHTMLAttributes<T> {
    fetchpriority?: 'high' | 'low' | 'auto';
  }
}
