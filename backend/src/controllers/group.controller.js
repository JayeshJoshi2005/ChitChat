import Group from "../models/group.model.js";
import Message from "../models/message.model.js";

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
    }).lean();
    const activity = await Message.aggregate([
      { $match: { groupId: { $in: groups.map((group) => group._id) } } },
      { $group: { _id: "$groupId", lastMessageAt: { $max: "$createdAt" } } },
    ]);
    const lastMessageByGroup = new Map(activity.map((item) => [String(item._id), item.lastMessageAt]));

    res.json(groups.map((group) => ({
      ...group, lastMessageAt: lastMessageByGroup.get(String(group._id)) || null,
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
