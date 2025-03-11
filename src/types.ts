import { LanguageDirection } from './theme';

export interface BaseComponentProps {
    languageDirection?: LanguageDirection;
}

export interface Size {
    height: number;
    width: number;
}

export interface ElementRect {
    bottom: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
}
