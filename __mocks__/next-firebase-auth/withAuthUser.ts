/* eslint-disable @typescript-eslint/no-explicit-any */

const withAuthUser = jest.fn(() => (wrappedComponent: any) => wrappedComponent);
export default withAuthUser;
