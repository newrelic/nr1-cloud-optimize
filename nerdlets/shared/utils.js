import React from 'react';
import AwsIcon from './images/awsIcon2.png';

export const generateFakeName = () => {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 10; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};

export const numberWithCommas = (x, round) => {
  // eslint-disable-next-line
  Number.prototype.round = function(places) {
    return +`${Math.round(`${this}e+${places}`)}e-${places}`;
  };

  return x
    .round(round || 2)
    .toString()
    .replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
};

export const renderProviderIcon = provider => {
  if (provider === 'AWS') {
    return <img width="40px" height="40px" src={AwsIcon} alt={provider} />;
  }
};

export const pickWorkloadColor = value => {
  if (value >= 0 && value < 20) {
    return { costColor: 'rgba(13, 54, 196, 0.1)', costFontColor: '#293338' };
  } else if (value >= 20 && value < 40) {
    return { costColor: 'rgba(13, 54, 196, 0.3)', costFontColor: '#293338' };
  } else if (value >= 40 && value < 60) {
    return { costColor: 'rgba(13, 54, 196, 0.6)', costFontColor: '#FAFBFB' };
  } else if (value >= 60 && value < 80) {
    return { costColor: 'rgba(13, 54, 196, 0.8)', costFontColor: '#FAFBFB' };
  } else if (value >= 80) {
    return { costColor: '#0D36C4', costFontColor: '#FAFBFB' };
  }
};

export const pickServiceColor = value => {
  if (value >= 0 && value < 20) {
    return { costColor: 'rgba(107, 37, 196, 0.1)', costFontColor: '#293338' };
  } else if (value >= 20 && value < 40) {
    return { costColor: 'rgba(107, 37, 196, 0.3)', costFontColor: '#293338' };
  } else if (value >= 40 && value < 60) {
    return { costColor: 'rgba(107, 37, 196, 0.6)', costFontColor: '#FAFBFB' };
  } else if (value >= 60 && value < 80) {
    return { costColor: 'rgba(107, 37, 196, 0.8)', costFontColor: '#FAFBFB' };
  } else if (value >= 80) {
    return { costColor: '#6B25C4', costFontColor: '#FAFBFB' };
  }
};
