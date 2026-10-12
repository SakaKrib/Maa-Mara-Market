import React from "react";
import "./native-launch-screen.css";

/**
 * Native-only launch overlay. The existing storefront logo classes and text
 * are retained so the app intro uses the brand styling defined in maamara.css.
 */
const NativeAppLaunchScreen = ({ showSpinner = false }) => (
  <div className="mm-native-launch-screen" role="status" aria-live="polite" aria-label={showSpinner ? "Loading Maa Mara Market" : "Maa Mara Market"}>
    <div className="mm-native-launch-content">
      <div className="logo mm-launch-logo">
        <a
          className="mm-launch-logo-link"
          href="/"
          onClick={(event) => event.preventDefault()}
          aria-label="Maa Mara Market"
        >
          <span className="mm-launch-maa">Maa</span>{" "}
          <span className="it-name mm-launch-mara">Mara</span>{" "}
          <span className="mkrt mm-launch-market">Market</span>
        </a>
      </div>
      <div className={`mm-native-launch-loader ${showSpinner ? "is-visible" : ""}`} aria-hidden={!showSpinner}>
        <span className="mm-native-launch-spinner" />
        <span className="mm-native-launch-loading-text">Preparing your marketplace</span>
      </div>
    </div>
  </div>
);

export default NativeAppLaunchScreen;
