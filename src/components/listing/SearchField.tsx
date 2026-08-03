import Svg from '../Svg';

export default function SearchField({
  value, onChange, placeholder = 'Select field to search...',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="searchband">
      <div className="searchfield">
        <input value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} aria-label={placeholder} />
        {value
          ? <button className="clear" title="Clear" aria-label="Clear search"
              onClick={() => onChange('')}><Svg name="x" /></button>
          : <Svg name="search" />}
      </div>
    </div>
  );
}
