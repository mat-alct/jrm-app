import 'firebase/database';
import 'firebase/auth';

import firebase from 'firebase/app';

const auth = firebase.auth();
const database = firebase.database();

export { auth, database, firebase };
