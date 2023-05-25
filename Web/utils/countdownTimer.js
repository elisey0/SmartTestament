export default function countdownTimer(timestamp) {
  const currentTime = Math.floor(Date.now() / 1000);
  const timeLeft = Math.max(0, timestamp - currentTime);

  let timeString = "";
  let buffTime;
  if (timeLeft >= 365 * 24 * 60 * 60) {
    const years = Math.floor(timeLeft / (365 * 24 * 60 * 60));
    const yearsString = getYearsString(years);
    timeString += `${years} ${yearsString}, `;
    buffTime = timeLeft - years * (365 * 24 * 60 * 60);
  } else {
    buffTime = timeLeft;
  }

  if (buffTime >= 24 * 60 * 60) {
    const days = Math.floor(buffTime / (24 * 60 * 60));
    return timeString + `${days} дн. `;
  }

  if (timeLeft >= 60 * 60) {
    const hours = Math.floor(timeLeft / (60 * 60));
    const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
    const seconds = timeLeft % 60;
    return `${hours} час., ${minutes} мин., ${seconds} сек.`;
  }
  if (timeLeft >= 60) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes} мин., ${seconds} сек.`;
  }
  return `${timeLeft} сек.`;
}

const getYearsString = (years) => {
  if (years >= 5 && years <= 20) {
    return "лет";
  } else if (years % 10 === 1) {
    return "год";
  } else if (years % 10 >= 2 && years % 10 <= 4) {
    return "года";
  } else {
    return "лет";
  }
};
