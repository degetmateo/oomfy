import { useRef } from 'react';
import { useSearchParams, SetURLSearchParams } from 'react-router-dom';
import { useViewActive } from '../contexts/ViewActivityContext.js';

export function useViewSearchParams(): [URLSearchParams, SetURLSearchParams] {
  const [liveSearchParams, setSearchParams] = useSearchParams();
  const isActive = useViewActive();
  const frozenParamsRef = useRef<URLSearchParams>(new URLSearchParams(liveSearchParams));

  if (isActive) {
    frozenParamsRef.current = liveSearchParams;
  }

  return [isActive ? liveSearchParams : frozenParamsRef.current, setSearchParams];
}
