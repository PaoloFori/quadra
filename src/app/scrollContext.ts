import { createContext, useContext, type RefObject } from 'react';

/** L'elemento che scorre (la pagina corrente): serve alle liste virtualizzate. */
export const ScrollContext = createContext<RefObject<HTMLDivElement | null>>({ current: null });

export const useScrollElement = (): RefObject<HTMLDivElement | null> => useContext(ScrollContext);
