import G0P0 from '../../../public/images/tags/G0P0.svg';
import G0P1 from '../../../public/images/tags/G0P1.svg';
import G0P2 from '../../../public/images/tags/G0P2.svg';
import G1P0 from '../../../public/images/tags/G1P0.svg';
import G1P1 from '../../../public/images/tags/G1P1.svg';
import G1P2 from '../../../public/images/tags/G1P2.svg';
import G2P0 from '../../../public/images/tags/G2P0.svg';
import G2P1 from '../../../public/images/tags/G2P1.svg';
import G2P2 from '../../../public/images/tags/G2P2.svg';

interface AvatarProps {
  src: StaticImageData['src'];
  width: number;
  height: number;
}

const asAvatar = (image: unknown): AvatarProps => image as AvatarProps;

type sortCutlistDataProps = {
  sideA: number;
  sideB: number;
  borderA: number;
  borderB: number;
};

type sortCutlistDataReturn = {
  gside: number;
  pside: number;
  avatar: AvatarProps;
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
  let avatar: AvatarProps;

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
      avatar = asAvatar(G0P0);
      break;
    case 'G0P1':
      avatar = asAvatar(G0P1);
      break;
    case 'G0P2':
      avatar = asAvatar(G0P2);
      break;
    case 'G1P0':
      avatar = asAvatar(G1P0);
      break;
    case 'G1P1':
      avatar = asAvatar(G1P1);
      break;
    case 'G1P2':
      avatar = asAvatar(G1P2);
      break;
    case 'G2P0':
      avatar = asAvatar(G2P0);
      break;
    case 'G2P1':
      avatar = asAvatar(G2P1);
      break;
    case 'G2P2':
      avatar = asAvatar(G2P2);
      break;
    default:
      avatar = asAvatar(G0P0);
      break;
  }

  return {
    gside,
    pside,
    avatar,
  };
};
import type { StaticImageData } from 'next/image';
