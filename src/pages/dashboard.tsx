import { AuthAction, withAuthUser } from 'next-firebase-auth';
import React from 'react';

const DemoPage = () => <div>My demo page</div>;

export default withAuthUser({
  whenUnauthedAfterInit: AuthAction.REDIRECT_TO_LOGIN,
  authPageURL: '/login',
})(DemoPage);
