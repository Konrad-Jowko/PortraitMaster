const Photo = require('../models/photo.model');
const Voter = require('../models/voter.model');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;
    const exceptions = [/&/g, /</g, />/g, /"/g,/'/g];
    const forbidden = [ "&amp;", "&lt;", "&gt;", "&quot;", "&#039;"];

    function escape(html) {
      return html.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    const escapedTitle = escape(title);
    const escapedAuthor = escape(author);
    const escapedEmail = escape(email);

    function verify(element, forbidden) {
      for (item of forbidden) {
        if (element.includes(item)) {
          throw new Error('Wrong input!');
        }
      }
    }

    verify(escapedTitle, forbidden);
    verify(escapedAuthor, forbidden);
    verify(escapedEmail, forbidden);

    if(escapedTitle && escapedAuthor && escapedEmail && file) { // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const extention = fileName.split('.').slice(-1)[0];

      if (escapedTitle.length > 50 || escapedAuthor.length > 25 || !escapedEmail.includes('@') || !escapedEmail.includes('.') ) throw new Error('Wrong input!');

      if (extention != 'gif' && extention != 'jpg' && extention != 'png') {
        throw new Error('Wrong input!');
      } else {
        const newPhoto = new Photo({ title:escapedTitle , author:escapedAuthor , email:escapedEmail , src: fileName, votes: 0 });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      }
    } else {
      throw new Error('Wrong input!');
    }

  } catch(err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {

  const update = async (id) => {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if(!photoToUpdate) res.status(404).json({ message: 'Not found' });
    else {
      photoToUpdate.votes++;
      photoToUpdate.save();
      res.send({ message: 'OK' });
    }
  };

  try {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const voter = await Voter.findOne({ user: ip });

    if (!voter) {
      const newVoter = new Voter({user: ip, votes: [req.params.id]})
      await newVoter.save();
      update(req.params.id);

    } else {
      const votes = voter.votes;
      const doesExist = votes.includes(req.params.id);

      if (!doesExist) {
        voter.votes.push(req.params.id);
        voter.save();

        update(req.params.id);
      } else {
        throw new Error('Repeated vote!');
      }
    }
  } catch(err) {
    res.status(500).json(err);
  }

};
