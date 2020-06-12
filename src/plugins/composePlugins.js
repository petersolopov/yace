function composePlugins(plugins, event) {
  const { value, selectionStart, selectionEnd } = event.target;

  return plugins.reduce(
    (acc, plugin) => {
      return {
        ...acc,
        ...plugin(acc, event),
      };
    },
    { value, selectionStart, selectionEnd }
  );
}

export default composePlugins;
