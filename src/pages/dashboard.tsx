import { withAuthUser, AuthAction } from "next-firebase-auth";

const DemoPage = () => <div>My demo page</div>;

export default withAuthUser({
  whenUnauthedAfterInit: AuthAction.REDIRECT_TO_LOGIN,
  authPageURL: "/login",
})(DemoPage);
