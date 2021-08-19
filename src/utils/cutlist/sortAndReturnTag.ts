import G0P0 from '../../../public/images/tags/G0P0.svg';
import G0P1 from '../../../public/images/tags/G0P1.svg';
import G0P2 from '../../../public/images/tags/G0P2.svg';
import G1P0 from '../../../public/images/tags/G1P0.svg';
import G1P1 from '../../../public/images/tags/G1P1.svg';
import G1P2 from '../../../public/images/tags/G1P2.svg';
import G2P0 from '../../../public/images/tags/G2P0.svg';
import G2P1 from '../../../public/images/tags/G2P1.svg';
import G2P2 from '../../../public/images/tags/G2P2.svg';

type sortCutlistDataProps = {
  sideA: number;
  sideB: number;
  borderA: number;
  borderB: number;
};

type sortCutlistDataReturn = {
  gside: number;
  pside: number;
  avatar: string;
};

export const sortCutlistData = ({
  sideA,
  sideB,
  borderA,
  borderB,
}: sortCutlistDataProps): sortCutlistDataReturn => {
  let gside: number;
  let pside: number;
  let gborder: number;
  let pborder: number;
  let avatar: string;

  // Sort sizes
  if (sideA >= sideB) {
    gside = sideA;
    gborder = borderA;
    pside = sideB;
    pborder = borderB;
  } else {
    gside = sideB;
    gborder = borderB;
    pside = sideA;
    pborder = borderA;
  }

  // Select avatar
  const avatarString = `G${gborder}P${pborder}`;
  switch (avatarString) {
    case 'G0P0':
      avatar = G0P0;
      break;
    case 'G0P1':
      avatar = G0P1;
      break;
    case 'G0P2':
      avatar = G0P2;
      break;
    case 'G1P0':
      avatar = G1P0;
      break;
    case 'G1P1':
      avatar = G1P1;
      break;
    case 'G1P2':
      avatar = G1P2;
      break;
    case 'G2P0':
      avatar = G2P0;
      break;
    case 'G2P1':
      avatar = G2P1;
      break;
    case 'G2P2':
      avatar = G2P2;
      break;
    default:
      avatar = G0P0;
      break;
  }

  return {
    gside,
    pside,
    avatar,
  };
};
