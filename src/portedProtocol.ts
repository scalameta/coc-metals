import { MarkedString, Range } from "vscode-languageserver-protocol";

/**
 * Things in here are things I've found to be pretty VS Code specific, and therefore
 * not explicit to LSP or to implemented in coc.nvim. However, there are ways that where
 * can implement them, so I've directly ported them here.
 *
 * Keep in mind that some may not be fully implemented here in the same way.
 */

export interface InputBoxOptions {
  /** * The value to prefill in the input box.  */
  value?: string;
  /** * Selection of the prefilled [`value`](#InputBoxOptions.value). Defined as tuple of two number where the * first is the inclusive start index and the second the exclusive end index. When `undefined` the whole * word will be selected, when empty (start equals end) only the cursor will be set, * otherwise the defined range will be selected.  */ valueSelection?: [
    number,
    number
  ];

  /**
   * The text to display underneath the input box.
   */
  prompt?: string;

  /**
   * An optional string to show as place holder in the input box to guide the user what to type.
   */
  placeHolder?: string;

  /**
   * Set to `true` to show a password prompt that will not show the typed value.
   */
  password?: boolean;

  /**
   * Set to `true` to keep the input box open when focus moves to another part of the editor or to another window.
   */
  ignoreFocusOut?: boolean;

  /**
   * An optional function that will be called to validate input and to give a hint
   * to the user.
   *
   * @param value The current value of the input box.
   * @return A human readable string which is presented as diagnostic message.
   * Return `undefined`, `null`, or the empty string when 'value' is valid.
   */
  validateInput?(
    value: string
  ): string | undefined | null | Thenable<string | undefined | null>;
}

/**
 * Represents options for a specific decoration in a [decoration set](#TextEditorDecorationType).
 */
export interface DecorationOptions {
  /**
   * Range to which this decoration is applied. The range must not be empty.
   */
  range: Range;

  /**
   * A message that should be rendered when hovering over the decoration.
   *
   * Note that this is changed a bit to more accomodate what we are getting from Metals
   */
  hoverMessage?: MarkedString;

  /**
   * Render options applied to the current decoration. For performance reasons, keep the
   * number of decoration specific options small, and use decoration types wherever possible.
   */

  renderOptions?: DecorationInstanceRenderOptions;
}

export interface DecorationInstanceRenderOptions
  extends ThemableDecorationInstanceRenderOptions {
  /**
   * Overwrite options for light themes.
   */
  light?: ThemableDecorationInstanceRenderOptions;

  /**
   * Overwrite options for dark themes.
   */
  dark?: ThemableDecorationInstanceRenderOptions;
}

export interface ThemableDecorationInstanceRenderOptions {
  /**
   * Defines the rendering options of the attachment that is inserted before the decorated text.
   */
  before?: ThemableDecorationAttachmentRenderOptions;

  /**
   * Defines the rendering options of the attachment that is inserted after the decorated text.
   */
  after?: ThemableDecorationAttachmentRenderOptions;
}

export interface ThemableDecorationAttachmentRenderOptions {
  /**
   * Defines a text content that is shown in the attachment. Either an icon or a text can be shown, but not both.
   */
  contentText?: string;
  /**
   * CSS styling property that will be applied to the decoration attachment.
   */
  fontStyle?: string;
}
