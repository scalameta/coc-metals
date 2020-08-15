import { Range, MarkupContent } from "vscode-languageserver-protocol";

/**
 * Things in here are things I've found to be pretty VS Code specific, and therefore
 * not explicit to LSP or to implemented in coc.nvim. However, there are ways that where
 * can implement them, so I've directly ported them here.
 *
 * Keep in mind that some may not be fully implemented here in the same way.
 */

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
  hoverMessage?: MarkupContent;

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
