import { GoogleLogin } from "@react-oauth/google";

export default function GoogleLoginButton() {
  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        console.log("LOGIN SUCCESS:", credentialResponse);
      }}
      onError={() => {
        console.log("LOGIN FAILED");
      }}
    />
  );
}