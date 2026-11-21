export const PLAY_MONEY_NOTICE = 'Play money. No cash value. No deposits or withdrawals.';

export function PlayMoneyBar() {
  return (
    <div className="pm-bar" role="note" data-testid="play-money-banner">
      <span className="pm-bar__dot" aria-hidden="true" />
      <strong>{PLAY_MONEY_NOTICE}</strong>
    </div>
  );
}
