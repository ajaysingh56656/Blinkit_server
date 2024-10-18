import { Customer, DeliveryPartner } from "../../models/user.js";
import jwt from "jsonwebtoken";

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

export const loginCustomer = async (req, reply) => {
  try {
    const { phone } = req.body;
    let customer = await Customer.findOne({ phone });
    if (!customer) {
      customer = new Customer({
        phone,
        role: "customer",
        isActivated: true,
      });
      await customer.save();
    }

    const { accessToken, refreshToken } = generateTokens(customer);
    reply.send({
      customer,
      accessToken,
      refreshToken,
      message: customer ? "Login Successfull" : "User created",
    });
  } catch (err) {
    return reply.status(500).send({ message: "Internal Server Error", err });
  }
};

export const loginDeliveryPartner = async (req, reply) => {
  try {
    const { email, password } = req.body;
    let customer = await Customer.findOne({ email });
    if (!customer) {
      return reply
        .status(404)
        .send({ message: "Delevery partner not found", err });
    }
    const isMatch = password === customer.password;
    if (!isMatch) {
      return reply.status(400).send({ message: "Invalid Password" });
    }

    const { accessToken, refreshToken } = generateTokens(customer);
    reply.send({
      customer,
      accessToken,
      refreshToken,
      message: "Login Successfull",
    });
  } catch (err) {
    return reply.status(500).send({ message: "Internal Server Error", err });
  }
};

export const refreshToken = async (req, reply) => {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
      return reply.status(401).send({ message: "No refresh token provided" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    if (!decoded) {
      return reply
        .status(403)
        .send({ message: "Invalid or expired refresh token" });
    }
    let user;

    if (decoded.role === "Customer") {
      user = await Customer.findOne({
        _id: decoded.userId,
        role: decoded.role,
      });
    } else if (decoded.role === "DeliveryPartner") {
      user = await DeliveryPartner.findOne({
        _id: decoded.userId,
        role: decoded.role,
      });
    }

    if (!user) {
      return reply.status(403).send({ message: "Invalid refresh token" });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    reply.send({
      message: "Token Refreshed",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return reply.status(500).send({ message: "Internal Server Error", err });
  }
};

export const fetchUser = async (req, reply) => {
  try {
    if (!req.user) {
      return reply.status(401).send({ message: "Unauthorized" });
    }
    const { userId, role } = req.user;
    let user;
    if (role === "Customer") {
      user = await Customer.findById(userId);
    } else if (role === "DeliveryPartner") {
      user = await DeliveryPartner.findById(userId);
    }
    if (!user) {
      return reply.status(404).send({ message: "User not found" });
    }
    reply.send({ user, message: "User fetch succefuly" });
  } catch (err) {
    return reply.status(500).send({ message: "Internal Server Error", err });
  }
};

