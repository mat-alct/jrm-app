import firebase from 'firebase/app';

import 'firebase/database'
import 'firebase/auth';

const auth = firebase.auth();
const database = firebase.database();

export { firebase, auth, database };
