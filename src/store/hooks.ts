
// import { useDispatch, useSelector } from 'react-redux';
// import type { TypedUseSelectorHook } from 'react-redux';

// import type { RootState, AppDispatch } from './index';

// export const useAppDispatch = () => useDispatch<AppDispatch>();

// export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

import type { AppDispatch, RootState } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
/** Use to read the LATEST state inside event handlers (not a stale render value). */
export const useAppStore = () => useStore<RootState>();