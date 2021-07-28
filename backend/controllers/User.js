const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const maskData = require("../node_modules/maskdata/lib/emailMask/EmailMask");

const emailMaskOptions = {
  maskWith: "*",
  unmaskedStartCharactersBeforeAt: 3,
  unmaskedEndCharactersAfterAt: 2,
  maskAtTheRate: false,
};

const passwordValidator = require("password-validator");

const schema = new passwordValidator();
schema
  .is()
  .min(9)
  .has()
  .digits(1) // min 1 chiffre
  .has()
  .uppercase(1) // min 1 caractère majuscule
  .has()
  .lowercase(1) // min 1 caractère minuscule
  .has()
  .not()
  .spaces();

const User = require("../models/user");

exports.signup = (req, res, next) => {
  if (!schema.validate(req.body.password)) {
    res.status(401).json({
      message:
        "Mot de passe incorrect ou pas assez sécurisé, il doit contenir au moins 9 caractères, un chiffre, une majuscule, une minuscule, sans espace !",
    });
    return false;
  }
  bcrypt
    .hash(req.body.password, 10)
    .then((hash) => {
      const user = new User({
        email: maskData.maskEmail2(req.body.email, emailMaskOptions),
        password: hash,
      });
      user
        .save()
        .then(() => res.status(201).json({ message: "Utilisateur créé !" }))
        .catch((error) => {
          console.log("signup");
          res.status(400).json({ error });
        });
    })
    .catch((error) => res.status(500).json({ error }));
};

exports.login = (req, res, next) => {
  User.findOne({
    email: maskData.maskEmail2(req.body.email, emailMaskOptions),
  })
    .then((user) => {
      if (!user) {
        return res.status(401).json({ error: "Utilisateur non trouvé!" });
      }
      bcrypt
        .compare(req.body.password, user.password)
        .then((valid) => {
          if (!valid) {
            return res.status(401).json({ error: "Mot de passe incorrect!" });
          }
          res.status(200).json({
            userId: user._id,
            token: jwt.sign(
              { userId: user._id },
              "RANDOM_TOKEN_VERY_TOP_SECRET",
              {
                expiresIn: "24h",
              }
            ),
          });
        })
        .catch((error) => res.status(500).json({ error }));
    })
    .catch((error) => res.status(500).json({ error }));
};
