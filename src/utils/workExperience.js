const getDisplayOrder = (experience) => {
  const order = Number(experience?.display_order);
  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
};

const getStartTime = (experience) => {
  const startDate =
    experience?.start_date ||
    experience?.startDate ||
    (experience?.startYear ? `${experience.startYear}-01-01` : null) ||
    experience?.period;
  const time = new Date(startDate).getTime();
  return Number.isFinite(time) ? time : Number.MIN_SAFE_INTEGER;
};

export const sortWorkExperiences = (experiences) =>
  [...(experiences || [])].sort((a, b) => {
    if (Boolean(a?.is_current) !== Boolean(b?.is_current)) {
      return a?.is_current ? -1 : 1;
    }

    const displayOrderDifference = getDisplayOrder(a) - getDisplayOrder(b);
    if (displayOrderDifference !== 0) return displayOrderDifference;

    return getStartTime(b) - getStartTime(a);
  });
