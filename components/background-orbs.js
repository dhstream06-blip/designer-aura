export function BackgroundOrbs() {
  return (
    <>
      <div className="background-scene" aria-hidden="true">
        <div className="background-scene__mesh" />
        <div className="background-scene__beam background-scene__beam--left" />
        <div className="background-scene__beam background-scene__beam--right" />
        <div className="background-scene__glow" />
        <div className="background-scene__noise" />
      </div>
    </>
  );
}
