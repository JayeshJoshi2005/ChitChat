import Group from "../models/group.model.js";

export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name || !members || members.length < 1) {
      return res.status(400).json({
        message: "Group name and members required",
      });
    }

    const group = await Group.create({
      name,
      members: [...members, req.user._id],
      admin: req.user._id,
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user._id,
    });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
