import React, { useEffect, useMemo, useState } from "react";
import { resolveApiAssetUrl } from "../../../../../../Services/Api";

const resolveImage = (value) => resolveApiAssetUrl(value);
