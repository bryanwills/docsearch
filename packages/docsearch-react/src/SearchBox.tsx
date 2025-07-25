import type { UseChatHelpers } from '@ai-sdk/react';
import type { AutocompleteApi, AutocompleteState } from '@algolia/autocomplete-core';
import React, { type JSX, type RefObject } from 'react';

import { MAX_QUERY_SIZE } from './constants';
import { LoadingIcon, CloseIcon, SearchIcon, SparklesIcon } from './icons';
import { BackIcon } from './icons/BackIcon';
import type { InternalDocSearchHit } from './types';

export type SearchBoxTranslations = Partial<{
  clearButtonTitle: string;
  clearButtonAriaLabel: string;
  closeButtonText: string;
  closeButtonAriaLabel: string;
  placeholderText: string;
  placeholderTextAskAi: string;
  placeholderTextAskAiStreaming: string;
  enterKeyHint: string;
  enterKeyHintAskAi: string;
  searchInputLabel: string;
  backToKeywordSearchButtonText: string;
  backToKeywordSearchButtonAriaLabel: string;
}>;

interface SearchBoxProps
  extends AutocompleteApi<InternalDocSearchHit, React.FormEvent, React.MouseEvent, React.KeyboardEvent> {
  state: AutocompleteState<InternalDocSearchHit>;
  autoFocus: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onAskAiToggle: (toggle: boolean) => void;
  onAskAgain: (query: string) => void;
  placeholder: string;
  isAskAiActive: boolean;
  askAiStatus: UseChatHelpers['status'];
  isFromSelection: boolean;
  translations?: SearchBoxTranslations;
}

export function SearchBox({ translations = {}, ...props }: SearchBoxProps): JSX.Element {
  const {
    clearButtonTitle = 'Clear',
    clearButtonAriaLabel = 'Clear the query',
    closeButtonText = 'Close',
    closeButtonAriaLabel = 'Close',
    searchInputLabel = 'Search',
    backToKeywordSearchButtonText = 'Back to keyword search',
    backToKeywordSearchButtonAriaLabel = 'Back to keyword search',
    placeholderTextAskAiStreaming = 'Answering...',
  } = translations;
  const { onReset } = props.getFormProps({
    inputElement: props.inputRef.current,
  });

  React.useEffect(() => {
    if (props.autoFocus && props.inputRef.current) {
      props.inputRef.current.focus();
    }
  }, [props.autoFocus, props.inputRef]);

  React.useEffect(() => {
    if (props.isFromSelection && props.inputRef.current) {
      props.inputRef.current.select();
    }
  }, [props.isFromSelection, props.inputRef]);

  const baseInputProps = props.getInputProps({
    inputElement: props.inputRef.current!,
    autoFocus: props.autoFocus,
    maxLength: MAX_QUERY_SIZE,
  });

  const blockedKeys = new Set(['ArrowUp', 'ArrowDown', 'Enter']);
  const origOnKeyDown = baseInputProps.onKeyDown;
  const origOnChange = baseInputProps.onChange;
  const isAskAiStreaming = props.askAiStatus === 'streaming' || props.askAiStatus === 'submitted';
  const isKeywordSearchLoading = props.state.status === 'stalled';

  // when returning to another status than streaming or submitted, we focus on the input
  React.useEffect(() => {
    if (props.askAiStatus !== 'streaming' && props.askAiStatus !== 'submitted' && props.inputRef.current) {
      props.inputRef.current.focus();
    }
  }, [props.askAiStatus, props.inputRef]);

  /**
   * We need to block the default behavior of the input when AskAI is active.
   * This is because the input is used to ask another question when the user presses enter.
   *
   * Learn more on default autocomplete behavior:
   * https://github.com/algolia/autocomplete/blob/next/packages/autocomplete-core/src/getDefaultProps.ts.
   */
  const inputProps = {
    ...baseInputProps,
    enterKeyHint: props.isAskAiActive ? ('enter' as const) : ('search' as const),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>): void => {
      // block these up, down, enter listeners when AskAI is active
      if (props.isAskAiActive && blockedKeys.has(e.key)) {
        // enter key asks another question
        if (e.key === 'Enter' && !isAskAiStreaming && props.state.query) {
          props.onAskAgain(props.state.query);
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      origOnKeyDown?.(e);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (props.isAskAiActive) {
        props.setQuery(e.currentTarget.value);
        // block search when AskAI is active
        // we don't want to trigger the search when the user types
        // we already know they are asking a question
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      origOnChange?.(e);
    },
    disabled: isAskAiStreaming,
  };

  return (
    <>
      <form
        className="DocSearch-Form"
        onSubmit={(event) => {
          event.preventDefault();
        }}
        onReset={onReset}
      >
        {props.isAskAiActive ? (
          <>
            <button
              type="button"
              tabIndex={0}
              className="DocSearch-AskAi-Return"
              title={backToKeywordSearchButtonText}
              aria-label={backToKeywordSearchButtonAriaLabel}
              onClick={() => props.onAskAiToggle(false)}
            >
              <BackIcon />
            </button>
          </>
        ) : (
          <>
            {isKeywordSearchLoading && (
              <div className="DocSearch-LoadingIndicator">
                <LoadingIcon />
              </div>
            )}
            {!isKeywordSearchLoading && (
              <label className="DocSearch-MagnifierLabel" {...props.getLabelProps()}>
                <SearchIcon />
                <span className="DocSearch-VisuallyHiddenForAccessibility">{searchInputLabel}</span>
              </label>
            )}
          </>
        )}

        <input
          className="DocSearch-Input"
          ref={props.inputRef}
          {...inputProps}
          placeholder={isAskAiStreaming ? placeholderTextAskAiStreaming : props.placeholder}
        />

        <div className="DocSearch-Actions">
          {isAskAiStreaming && (
            <button type="button" className="DocSearch-StreamingIndicator" onClick={() => props.onAskAiToggle(true)}>
              <SparklesIcon />
            </button>
          )}

          <button
            className="DocSearch-Clear"
            type="reset"
            aria-label={clearButtonAriaLabel}
            hidden={!props.state.query}
            tabIndex={props.state.query ? 0 : -1}
            aria-hidden={!props.state.query ? 'true' : 'false'}
          >
            {clearButtonTitle}
          </button>

          {(isAskAiStreaming || props.state.query) && <div className="DocSearch-Divider" />}

          <button
            type="button"
            title={closeButtonText}
            className="DocSearch-Close"
            aria-label={closeButtonAriaLabel}
            onClick={props.onClose}
          >
            <CloseIcon />
          </button>
        </div>
      </form>
    </>
  );
}
