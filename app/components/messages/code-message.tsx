
const CodeMessage = ({ text, style }) => {
  return (
    <div className="p-4 font-mono" style={{ ...style }}>
      {text.split("\n").map((line, index) => (
        <div key={index} className="mt-1">
          <span className="text-zinc-400 mr-2">{`${index + 1}. `}</span>
          {line}
        </div>
      ))}
    </div>
  );
};

export default CodeMessage;
