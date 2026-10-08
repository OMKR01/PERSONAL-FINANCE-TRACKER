import jwt from "jsonwebtoken";

export const protect = async (req, res, next) => {
  try {
    // Accept token from cookie OR Authorization: Bearer <token> header
    let token = req.cookies.token;
    if (
      !token &&
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, no token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Token failed verification" });
  }
};
