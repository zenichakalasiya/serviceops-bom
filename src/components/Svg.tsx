/**
 * Renders one of the product's own SVG glyphs.
 *
 * The captured markup is trusted, static, build-time content extracted from the
 * source app — never user input — so dangerouslySetInnerHTML is safe here. Size
 * and colour come from CSS (the glyphs have their width/height attributes
 * stripped and use currentColor).
 */
import { icon } from '../icons/lucide';

interface Props {
  /** lucide icon name, e.g. "file-text" */
  name?: string;
  /** raw SVG markup, when it did not come from the named set */
  markup?: string;
  /** inline SVG to use if the name is not in the captured set */
  fallback?: string;
  className?: string;
}

export default function Svg({ name, markup, fallback = '', className }: Props) {
  const html = markup ?? icon(name ?? '', fallback);
  if (!html) return null;
  return <span className={className} style={{ display: 'contents' }}
    dangerouslySetInnerHTML={{ __html: html }} />;
}
